import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

class MauticManager {
  constructor() {
    this.apiUrl = process.env.MAUTIC_API_URL || 'https://mautic.bookaistudio.com/api';
    this.clientId = process.env.MAUTIC_CLIENT_ID;
    this.clientSecret = process.env.MAUTIC_CLIENT_SECRET;
    this.username = process.env.MAUTIC_USERNAME;
    this.password = process.env.MAUTIC_PASSWORD;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.authMethod = this.determineAuthMethod();
  }

  /**
   * Determine which authentication method to use
   */
  determineAuthMethod() {
    if (this.username && this.password) {
      console.log('🔑 Using Basic Auth for Mautic API');
      return 'basic';
    } else if (this.clientId && this.clientSecret) {
      console.log('🔑 Using OAuth2 for Mautic API');
      return 'oauth2';
    } else {
      console.warn('⚠️ No Mautic credentials configured');
      return 'none';
    }
  }

  /**
   * Get authentication header based on method
   */
  async getAuthHeader() {
    switch (this.authMethod) {
      case 'basic':
        return this.getBasicAuthHeader();
      case 'oauth2':
        return await this.getOAuth2Header();
      default:
        throw new Error('No authentication method configured for Mautic API');
    }
  }

  /**
   * Get Basic Auth header
   */
  getBasicAuthHeader() {
    const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Get OAuth2 Bearer token header
   */
  async getOAuth2Header() {
    const token = await this.getAccessToken();
    return `Bearer ${token}`;
  }
  /**
   * Get OAuth2 access token for Mautic API
   */
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await fetch(`${this.apiUrl}/oauth/v2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OAuth2 token request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: `${this.apiUrl}/oauth/v2/token`,
          clientId: this.clientId,
          clientSecretLength: this.clientSecret?.length
        });
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry

      console.log('✅ OAuth2 token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('Error getting Mautic access token:', error);
      throw error;
    }
  }

  /**
   * Make authenticated API call to Mautic
   */
  async makeMauticAPICall(endpoint, method = 'GET', data = null) {
    try {
      const authHeader = await this.getAuthHeader();
      
      const options = {
        method,
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;
      console.log(`📡 Making ${method} request to: ${url}`);
      
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Mautic API Error:', {
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          authMethod: this.authMethod
        });
        throw new Error(`Mautic API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ API call successful: ${method} ${url}`);
      return result;
    } catch (error) {
      console.error('Mautic API call failed:', error);
      throw error;
    }
  }

  // ===== CONTACT MANAGEMENT =====

  /**
   * Get all contacts with pagination
   */
  async getContacts(limit = 30, start = 0, search = '', orderBy = 'id', orderByDir = 'ASC') {
    const params = new URLSearchParams({
      limit: limit.toString(),
      start: start.toString(),
      orderBy,
      orderByDir,
    });
    
    if (search) {
      params.append('search', search);
    }

    return await this.makeMauticAPICall(`/contacts?${params}`);
  }

  /**
   * Get a specific contact by ID
   */
  async getContact(contactId) {
    return await this.makeMauticAPICall(`/contacts/${contactId}`);
  }

  /**
   * Create a new contact
   */
  async createContact(contactData) {
    return await this.makeMauticAPICall('/contacts/new', 'POST', contactData);
  }

  /**
   * Update an existing contact
   */
  async updateContact(contactId, contactData) {
    return await this.makeMauticAPICall(`/contacts/${contactId}/edit`, 'PUT', contactData);
  }

  /**
   * Delete a contact
   */
  async deleteContact(contactId) {
    return await this.makeMauticAPICall(`/contacts/${contactId}/delete`, 'DELETE');
  }

  /**
   * Add contact to a segment
   */
  async addContactToSegment(contactId, segmentId) {
    return await this.makeMauticAPICall(`/segments/${segmentId}/contact/${contactId}/add`, 'POST');
  }

  /**
   * Remove contact from a segment
   */
  async removeContactFromSegment(contactId, segmentId) {
    return await this.makeMauticAPICall(`/segments/${segmentId}/contact/${contactId}/remove`, 'POST');
  }

  // ===== CAMPAIGN MANAGEMENT =====

  /**
   * Get all campaigns
   */
  async getCampaigns(limit = 30, start = 0, search = '') {
    const params = new URLSearchParams({
      limit: limit.toString(),
      start: start.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    return await this.makeMauticAPICall(`/campaigns?${params}`);
  }

  /**
   * Get a specific campaign by ID
   */
  async getCampaign(campaignId) {
    return await this.makeMauticAPICall(`/campaigns/${campaignId}`);
  }

  /**
   * Create a new campaign
   */
  async createCampaign(campaignData) {
    return await this.makeMauticAPICall('/campaigns/new', 'POST', campaignData);
  }

  /**
   * Update an existing campaign
   */
  async updateCampaign(campaignId, campaignData) {
    return await this.makeMauticAPICall(`/campaigns/${campaignId}/edit`, 'PUT', campaignData);
  }

  /**
   * Add contact to campaign
   */
  async addContactToCampaign(campaignId, contactId) {
    return await this.makeMauticAPICall(`/campaigns/${campaignId}/contact/${contactId}/add`, 'POST');
  }

  /**
   * Remove contact from campaign
   */
  async removeContactFromCampaign(campaignId, contactId) {
    return await this.makeMauticAPICall(`/campaigns/${campaignId}/contact/${contactId}/remove`, 'POST');
  }

  // ===== EMAIL MANAGEMENT =====

  /**
   * Get all emails
   */
  async getEmails(limit = 30, start = 0, search = '') {
    const params = new URLSearchParams({
      limit: limit.toString(),
      start: start.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    return await this.makeMauticAPICall(`/emails?${params}`);
  }

  /**
   * Get a specific email by ID
   */
  async getEmail(emailId) {
    return await this.makeMauticAPICall(`/emails/${emailId}`);
  }

  /**
   * Create a new email
   */
  async createEmail(emailData) {
    return await this.makeMauticAPICall('/emails/new', 'POST', emailData);
  }

  /**
   * Update an existing email
   */
  async updateEmail(emailId, emailData) {
    return await this.makeMauticAPICall(`/emails/${emailId}/edit`, 'PUT', emailData);
  }

  /**
   * Send email to contact
   */
  async sendEmail(emailId, contactId, tokens = {}) {
    const data = {
      id: emailId,
      lead: contactId,
      tokens: tokens
    };
    return await this.makeMauticAPICall(`/emails/${emailId}/contact/${contactId}/send`, 'POST', data);
  }

  /**
   * Send email to segment
   */
  async sendEmailToSegment(emailId, segmentId) {
    return await this.makeMauticAPICall(`/emails/${emailId}/send`, 'POST', {
      segment: segmentId
    });
  }

  // ===== SEGMENT MANAGEMENT =====

  /**
   * Get all segments (lists)
   */
  async getSegments(limit = 30, start = 0, search = '') {
    const params = new URLSearchParams({
      limit: limit.toString(),
      start: start.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    return await this.makeMauticAPICall(`/segments?${params}`);
  }

  /**
   * Get a specific segment by ID
   */
  async getSegment(segmentId) {
    return await this.makeMauticAPICall(`/segments/${segmentId}`);
  }

  /**
   * Create a new segment
   */
  async createSegment(segmentData) {
    return await this.makeMauticAPICall('/segments/new', 'POST', segmentData);
  }

  /**
   * Update an existing segment
   */
  async updateSegment(segmentId, segmentData) {
    return await this.makeMauticAPICall(`/segments/${segmentId}/edit`, 'PUT', segmentData);
  }

  /**
   * Delete a segment
   */
  async deleteSegment(segmentId) {
    return await this.makeMauticAPICall(`/segments/${segmentId}/delete`, 'DELETE');
  }

  // ===== FORM MANAGEMENT =====

  /**
   * Get all forms
   */
  async getForms(limit = 30, start = 0, search = '') {
    const params = new URLSearchParams({
      limit: limit.toString(),
      start: start.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    return await this.makeMauticAPICall(`/forms?${params}`);
  }

  /**
   * Get a specific form by ID
   */
  async getForm(formId) {
    return await this.makeMauticAPICall(`/forms/${formId}`);
  }

  /**
   * Submit data to a form
   */
  async submitForm(formId, formData) {
    return await this.makeMauticAPICall(`/forms/${formId}/submit`, 'POST', formData);
  }

  // ===== ANALYTICS =====

  /**
   * Get email statistics
   */
  async getEmailStats(emailId) {
    return await this.makeMauticAPICall(`/stats/emails/${emailId}`);
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId) {
    return await this.makeMauticAPICall(`/stats/campaigns/${campaignId}`);
  }

  /**
   * Get contact points (lead scoring)
   */
  async getContactPoints(contactId) {
    return await this.makeMauticAPICall(`/contacts/${contactId}/points`);
  }

  /**
   * Add points to contact
   */
  async addPointsToContact(contactId, points, action = 'Manual adjustment') {
    return await this.makeMauticAPICall(`/contacts/${contactId}/points/plus/${points}`, 'POST', {
      eventaction: action
    });
  }

  /**
   * Subtract points from contact
   */
  async subtractPointsFromContact(contactId, points, action = 'Manual adjustment') {
    return await this.makeMauticAPICall(`/contacts/${contactId}/points/minus/${points}`, 'POST', {
      eventaction: action
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await this.makeMauticAPICall('/contacts?limit=1');
      return {
        success: true,
        message: 'Mautic API connection successful',
        data: response
      };
    } catch (error) {
      return {
        success: false,
        message: `Mautic API connection failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get API info
   */
  async getApiInfo() {
    return {
      apiUrl: this.apiUrl,
      hasCredentials: !!(this.clientId && this.clientSecret),
      tokenStatus: this.accessToken ? 'Active' : 'Not obtained'
    };
  }
}

export default MauticManager;
