import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App';

const publishableKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
const app = publishableKey ? (
	<ClerkProvider publishableKey={publishableKey}>
		<App />
	</ClerkProvider>
) : <App />;

ReactDOM.createRoot(document.getElementById('root')).render(app);
