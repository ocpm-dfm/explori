from fastapi import APIRouter

router = APIRouter(prefix="/session")


@router.get('/test')
def test():
    return {'status': 'successful'}
