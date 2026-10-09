from app.services.recommendations import recommendations

def test_recommendation_without_forecast_is_clear():
    class FakeResult:
        def __init__(self, value): self.value=value
        def scalars(self): return self
        def all(self): return self.value
        def first(self): return self.value
    class FakeDB:
        def __init__(self): self.n=0
        def execute(self, stmt):
            self.n+=1
            if self.n==1:
                class B: id=1; title="Test Book"; available_copies=2
                return FakeResult([B()])
            return FakeResult(None)
    result=recommendations(FakeDB())
    assert result[0]["status"]=="Insufficient data"
    assert result[0]["suggested_additional_copies"] is None
