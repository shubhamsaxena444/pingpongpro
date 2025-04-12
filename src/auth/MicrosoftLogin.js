import React from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from './authConfig';

class MicrosoftLogin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isAuthenticated: false,
      user: {},
      error: null
    };
    // Log config for debugging
    console.log("MSAL config client ID:", msalConfig.auth.clientId);
    this.msalInstance = new PublicClientApplication(msalConfig);
  }

  componentDidMount() {
    // Handle the redirect response
    this.msalInstance.handleRedirectPromise()
      .then(response => {
        // Check if response is null (no redirect response)
        if (!response) {
          // Check if user is already signed in
          const accounts = this.msalInstance.getAllAccounts();
          if (accounts.length > 0) {
            this.setState({
              isAuthenticated: true,
              user: accounts[0]
            });
          }
        } else {
          // User has been authenticated
          this.setState({
            isAuthenticated: true,
            user: response.account
          });
        }
      })
      .catch(error => {
        console.error("Error during authentication:", error);
        this.setState({ error: error.message });
      });
  }

  signIn = () => {
    try {
      // Use the standard loginRequest without modifying it
      this.msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error("Sign in error:", error);
      this.setState({ error: error.message });
    }
  }

  signOut = () => {
    const logoutRequest = {
      account: this.msalInstance.getAccountByUsername(this.state.user.username)
    };
    
    this.msalInstance.logout(logoutRequest);
  }

  render() {
    return (
      <div>
        {this.state.isAuthenticated ? (
          <div>
            <p>Welcome, {this.state.user.name}!</p>
            <button onClick={this.signOut}>Sign Out</button>
          </div>
        ) : (
          <div>
            <button onClick={this.signIn}>Sign in with Microsoft</button>
            {this.state.error && <p className="error">Error: {this.state.error}</p>}
          </div>
        )}
      </div>
    );
  }
}

export default MicrosoftLogin;
