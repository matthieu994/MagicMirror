import requests
import logging
import http.client

httpclient_logger = logging.getLogger("http.client")

def httpclient_logging_patch(level=logging.DEBUG):
    """Enable HTTPConnection debug logging to the logging framework"""

    def httpclient_log(*args):
        httpclient_logger.log(level, " ".join(args))

    # mask the print() built-in in the http.client module to use
    # logging instead
    http.client.print = httpclient_log
    # enable debugging
    http.client.HTTPConnection.debuglevel = 1

httpclient_logging_patch()
logging.basicConfig(level=logging.DEBUG)
urlOAuth =  'https://as.api.iledefrance-mobilites.fr/api/oauth/token'
client_id='f328931c-6bd6-4c6b-809f-e4124d9046b8'
client_secret='10a03ea6-35e0-4b3b-bedc-897ecbe8d2d2'
data = dict(
grant_type='client_credentials',
scope='read-data',
client_id=client_id,
client_secret=client_secret
)

response = requests.post(urlOAuth, data=data)
print(response.json)

if response.status_code != 200:
  print('Status:', response.status_code, 'Erreur sur la requête; fin de programme')
  exit()

jsonData = response.json()
token = jsonData['access_token']
print(token)
