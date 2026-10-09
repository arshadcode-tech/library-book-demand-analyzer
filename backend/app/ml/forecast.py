from collections import defaultdict
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from app.models.entities import IssueTransaction, Book, DemandForecast, ModelTrainingRun
from sqlalchemy import select

FEATURES = ["lag_1", "lag_2", "lag_3", "month", "book_id"]

def monthly_series(db):
    rows = db.execute(select(IssueTransaction.book_id, IssueTransaction.issue_date)).all()
    if not rows: return pd.DataFrame(columns=["book_id","month","issues"])
    df = pd.DataFrame([{"book_id": r[0], "month": pd.Timestamp(r[1]).to_period("M").to_timestamp()} for r in rows])
    grouped = df.groupby(["book_id","month"]).size().rename("issues").reset_index()
    all_months=[]
    for book_id, group in grouped.groupby("book_id"):
        idx=pd.date_range(group.month.min(), group.month.max(), freq="MS")
        s=group.set_index("month").issues.reindex(idx, fill_value=0).rename_axis("month").reset_index()
        s["book_id"]=book_id; all_months.append(s)
    return pd.concat(all_months, ignore_index=True) if all_months else pd.DataFrame(columns=["book_id","month","issues"])

def feature_frame(series):
    frames=[]
    for bid,g in series.groupby("book_id"):
        g=g.sort_values("month").copy()
        for lag in (1,2,3): g[f"lag_{lag}"]=g.issues.shift(lag)
        g["month_num"]=g.month.dt.month
        g["book_id_num"]=g.book_id
        g=g.dropna(subset=["lag_1","lag_2","lag_3"])
        frames.append(g.rename(columns={"month_num":"month_feature","book_id_num":"book_feature"}))
    if not frames:return pd.DataFrame()
    out=pd.concat(frames,ignore_index=True)
    return out.sort_values("month").reset_index(drop=True)

def train_and_forecast(db, model_path=None):
    series=monthly_series(db)
    features=feature_frame(series)
    if len(features)<8:
        run=ModelTrainingRun(model_name="Seasonal Naive Baseline", status="insufficient_data", training_rows=len(features), notes="At least 8 lagged monthly observations are needed for model evaluation.")
        db.add(run); db.commit()
        return {"status":"insufficient_data","message":"Not enough historical monthly observations to evaluate a machine-learning model. Add/import at least 4 months per book; 12+ months is recommended.","training_rows":len(features),"forecasts":[]}
    X=features[["lag_1","lag_2","lag_3","month_feature","book_feature"]].astype(float)
    y=features.issues.astype(float)
    split=max(1,int(len(features)*0.8))
    # Rows remain chronological within each book; the final portion is held out for an indicative validation score.
    X_train,y_train=X.iloc[:split],y.iloc[:split]
    X_test,y_test=X.iloc[split:],y.iloc[split:]
    model=RandomForestRegressor(n_estimators=160,random_state=42,min_samples_leaf=2)
    model.fit(X_train,y_train)
    if len(X_test):
        pred=np.maximum(0,model.predict(X_test)); mae=float(mean_absolute_error(y_test,pred)); rmse=float(np.sqrt(mean_squared_error(y_test,pred)))
    else: mae=None; rmse=None
    if model_path:
        import os, joblib
        os.makedirs(os.path.dirname(model_path) or ".",exist_ok=True); joblib.dump(model,model_path)
    books=db.execute(select(Book)).scalars().all(); forecasts=[]
    for book in books:
        g=series[series.book_id==book.id].sort_values("month")
        if len(g)<4:
            forecasts.append({"book_id":book.id,"title":book.title,"predicted_issues":None,"status":"Insufficient Data"}); continue
        vals=g.issues.astype(float).tolist(); next_month=(g.month.max()+pd.offsets.MonthBegin(1))
        lag1,lag2,lag3=vals[-1],vals[-2],vals[-3]
        x=pd.DataFrame([[lag1,lag2,lag3,next_month.month,book.id]],columns=["lag_1","lag_2","lag_3","month_feature","book_feature"])
        value=max(0.0,float(model.predict(x)[0])); value=round(value,1)
        forecast=DemandForecast(book_id=book.id,forecast_month=next_month.strftime("%Y-%m"),predicted_issues=value,model_name="Random Forest")
        existing=db.execute(select(DemandForecast).where(DemandForecast.book_id==book.id,DemandForecast.forecast_month==forecast.forecast_month,DemandForecast.model_name==forecast.model_name)).scalar_one_or_none()
        if existing: existing.predicted_issues=value
        else: db.add(forecast)
        forecasts.append({"book_id":book.id,"title":book.title,"predicted_issues":value,"forecast_month":next_month.strftime("%Y-%m"),"status":"Forecast ready"})
    db.add(ModelTrainingRun(model_name="Random Forest",mae=mae,rmse=rmse,training_rows=len(features),status="completed",notes="Time-ordered holdout evaluation; validate on a larger dataset before operational use."))
    db.commit()
    return {"status":"completed","model":"Random Forest","mae":mae,"rmse":rmse,"training_rows":len(features),"forecasts":forecasts}
