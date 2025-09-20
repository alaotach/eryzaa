import pytest

@pytest.fixture(scope='session')
def blockchain_setup():
    # Setup code for blockchain connection
    yield
    # Teardown code for blockchain connection

@pytest.fixture(scope='session')
def backend_setup():
    # Setup code for backend connection
    yield
    # Teardown code for backend connection