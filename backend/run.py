import sys
sys.stdout.reconfigure(encoding='utf-8')
import uvicorn

if __name__ == '__main__':
    print('>> Khoi dong Phuc Thanh Audio Backend API tai http://127.0.0.1:8000...')
    print('>> Swagger UI Docs: http://127.0.0.1:8000/docs')
    uvicorn.run('app.main:app', host='0.0.0.0', port=8000, reload=False)
