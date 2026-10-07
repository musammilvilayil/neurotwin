from fastapi import FastAPI
app=FastAPI(title='NeuroTwin ML Service',version='0.1.0')

@app.get('/health')
def health(): return {'status':'ok','service':'neurotwin-ml'}
