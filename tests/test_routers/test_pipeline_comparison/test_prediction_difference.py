from fastapi import FastAPI
from starlette.testclient import TestClient


def test_prediction_difference(app: FastAPI):
    client = TestClient(app)
    resp = client.get(
        "/comparison/prediction_difference?"
        "pipeline_index_base=0&pipeline_index_updated=1&dataset_split_name=eval"
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["utteranceCount"] == len(body["utterances"])
    assert all(
        utt["baseUtterance"]["modelPrediction"]["postprocessedPrediction"]
        != utt["updatedUtterance"]["modelPrediction"]["postprocessedPrediction"]
        for utt in body["utterances"]
    )
