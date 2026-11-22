"""Small explicit R2 checks; no existing objects are modified."""
import uuid


def verify_object_access(client, bucket):
    key = '__avestudio_setup__/' + uuid.uuid4().hex + '.txt'
    content = b'AVE Studio private school storage check\n'
    uploaded = False
    try:
        client.put_object(Bucket=bucket, Key=key, Body=content, StorageClass='STANDARD',
                          ContentType='text/plain', CacheControl='private, no-store')
        uploaded = True
        response = client.get_object(Bucket=bucket, Key=key)
        try:
            if response['Body'].read() != content:
                raise RuntimeError('R2 write/read check returned different content.')
        finally:
            response['Body'].close()
    finally:
        if uploaded:
            client.delete_object(Bucket=bucket, Key=key)


def bucket_usage(client, bucket):
    objects = size = 0
    for page in client.get_paginator('list_objects_v2').paginate(Bucket=bucket):
        for item in page.get('Contents', []):
            objects += 1
            size += item['Size']
    return objects, size
