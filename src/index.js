import http, { Server } from 'http';
import open from 'open';
import * as dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const {
  CLIENT_ID: client_id,
  CLIENT_SECRET: client_secret,
  REDIRECT_URI: redirect_uri,
  PORT: port,
} = process.env;

const scopes = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-read-currently-playing',
  'user-read-playback-position',
  'user-top-read',
  'user-read-recently-played',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  'user-library-modify',
  'user-follow-read',
  'user-follow-modify',
];

const host = 'localhost';

let LoadInterval;

const loadAnimation = (text = '') => {
  const chars = ['⠙', '⠘', '⠰', '⠴', '⠤', '⠦', '⠆', '⠃', '⠋', '⠉'];
  let x = 0;

  LoadInterval = setInterval(() => {
    process.stdout.write('\r' + chars[x++] + ' ' + text);
    x %= chars.length;
  }, 100);
};

const clearAnimation = () => {
  clearInterval(LoadInterval);
  process.stdout.clearLine();
  process.stdout.write('\r');
};

const httpErrorResponse = (res) => {
  res.end('Error Authenticating with Spotify. Check console for details.');
};

const requestListener = async (req, res) => {
  const url = new URL(`http://${host}:${port}${req.url}`);
  let qs = new URLSearchParams(url.search);

  let code = qs.get('code');
  let error = qs.get('error');

  clearAnimation();

  if (error) {
    httpErrorResponse(res);
    console.log(`Could not authenticate with Spotify (Error: ${error})`);
    return;
  }

  if (!code) {
    httpErrorResponse(res);
    console.log('Could not authenticate with Spotify (Code was missing)');
    return;
  }

  const header = `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString(
    'base64'
  )}`;

  try {
    loadAnimation('Requesting access token');

    let data = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
    });
    let config = {
      headers: {
        Authorization: header,
      },
    };

    let spotifyResponse = (
      await axios.post('https://accounts.spotify.com/api/token', data, config)
    ).data;

    clearAnimation();

    res.end(`<div>Successfully authenticated with Spotify.
			<a onclick="window.close()" style="cursor: pointer;">You can now close this window.</a></div>`);

    let expiresAt = new Date(
      new Date().getTime() + spotifyResponse.expires_in * 1000
    );

    console.log(
      'Successfully authenticated with Spotify API and pushed api tokens to database.'
    );

    console.log(spotifyResponse);
  } catch (err) {
    let statusCode = err.response;

    clearAnimation();
    httpErrorResponse(res);
    console.error(
      `Could not authenticate with Spotify servers (Error code ${statusCode}). ${err}`
    );
  } finally {
    process.exit(0);
  }
};

const server = http.createServer(requestListener);

server.listen(port, host, async () => {
  if (!client_id || !client_secret || !redirect_uri) {
    console.log('Required environment variables not found! Exiting....');
    process.exit;
  }

  let authString = new URLSearchParams({
    response_type: 'code',
    client_id,
    scope: scopes.join(' '),
    redirect_uri,
    show_dialog: true,
  });
  let url = `https://accounts.spotify.com/authorize?${authString}`;

  await open(url);

  console.log('Open browser to complete authentication.');
  loadAnimation('Waiting for authentication from Spotify.');
});
