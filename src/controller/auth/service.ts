import axios from "axios";

/**
 * Helper method to exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<any> {
  try {
    const params = {
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code: code,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.FRONTEND_URL}/auth/callback`,
    };

    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      params,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "Error exchanging code for token:",
      error.response?.data || error.message
    );
    return null;
  }
}

/**
 * Helper method to get user profile from Google
 */
export async function getUserProfile(accessToken: string): Promise<any> {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
    );

    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching user profile:",
      error.response?.data || error.message
    );
    return null;
  }
}
