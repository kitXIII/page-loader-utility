import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';

if (process.env.NODE_ENV === 'test') {
  axios.defaults.adapter = httpAdapter;
}

export default axios;
