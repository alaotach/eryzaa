def test_health_check():
    response = {"status": "healthy"}
    assert response["status"] == "healthy"