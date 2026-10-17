"""Resumable downloader for the public CHB-MIT EDF corpus (research use only)."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen

BASE='https://physionet.org/files/chbmit/1.0.0/'
def fetch(url, destination):
    destination.parent.mkdir(parents=True,exist_ok=True)
    if destination.exists() and destination.stat().st_size: return 'existing'
    partial=destination.with_suffix(destination.suffix+'.part'); offset=partial.stat().st_size if partial.exists() else 0
    request=Request(url,headers={'Range':f'bytes={offset}-'} if offset else {})
    with urlopen(request,timeout=60) as response, partial.open('ab' if offset else 'wb') as output:
        while chunk:=response.read(1024*1024): output.write(chunk)
    partial.replace(destination); return 'downloaded'
def main():
    p=argparse.ArgumentParser(); p.add_argument('--output-dir',required=True); p.add_argument('--subjects',nargs='*',help='optional subject ids, e.g. chb01 chb02'); p.add_argument('--workers',type=int,default=4); args=p.parse_args(); root=Path(args.output_dir)
    records=urlopen(BASE+'RECORDS',timeout=60).read().decode().splitlines(); wanted=set(args.subjects or [])
    records=[r for r in records if not wanted or r.split('/')[0] in wanted]
    summaries=sorted({f'{r.split("/")[0]}/{r.split("/")[0]}-summary.txt' for r in records}); paths=records+summaries
    failures=[]
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        jobs={pool.submit(fetch,BASE+path,root/path):path for path in paths}
        for job in as_completed(jobs):
            path=jobs[job]
            try: print(f'{job.result()}: {path}')
            except Exception as error: failures.append((path,str(error))); print(f'failed: {path}: {error}')
    if failures: raise SystemExit(f'{len(failures)} files failed; rerun to resume them.')
if __name__=='__main__': main()
