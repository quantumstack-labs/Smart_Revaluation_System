
import axios from 'axios';
import { supabase } from '../supabase'; 


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

let isRedirecting = false;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});


api.interceptors.request.use(
    async (config) => {
        try {
          
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (err) {
            console.warn(' Failed to attach session token:', err);
        }
        return config;
    },
    (error) => Promise.reject(error)
);


api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response ? error.response.status : null;

        if (status === 401 || status === 403) {
            console.warn(` Auth Error (${status}) detected.`);

     
            if (!isRedirecting) {
                isRedirecting = true;
                console.warn(' Initiating forced logout...');

      
                try {
                    await supabase.auth.signOut();
                } catch (e) {
                    console.warn('Supabase signout warning:', e);
                }

                localStorage.clear();
                sessionStorage.clear();

      
                const currentPath = window.location.pathname;
                const publicPaths = ['/login', '/signup', '/', '/track-status'];

                if (!publicPaths.some(path => currentPath.startsWith(path))) {
                    window.location.href = '/login';
                }

                setTimeout(() => {
                    isRedirecting = false;
                }, 2000);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
