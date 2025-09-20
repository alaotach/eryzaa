def test_api_endpoint():
    response = requests.get('http://localhost:5000/api/endpoint')
    assert response.status_code == 200
    assert 'expected_key' in response.json()

def test_blockchain_interaction():
    blockchain_response = requests.post('http://localhost:5000/blockchain/transaction', json={'data': 'test'})
    assert blockchain_response.status_code == 201
    assert blockchain_response.json()['status'] == 'success'