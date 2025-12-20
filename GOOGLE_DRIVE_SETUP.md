# Google Drive Integration Setup Guide

This guide explains how to set up Google Drive API access to read images from a publicly shared folder.

## Overview

The backend can connect to Google Drive and read images from a shared public folder. There are two authentication methods:

1. **API Key** (Recommended for public folders) - Simpler setup, no credentials file needed
2. **Service Account** (For advanced access) - More secure, requires credentials JSON file

## Step 1: Set Up Google Cloud Project

### 1.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "AveStudio Drive Integration")
5. Click "Create"

### 1.2 Enable Google Drive API

1. In your Google Cloud project, go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click on "Google Drive API"
4. Click the **Enable** button

### 1.3 Create API Key (Method 1 - Recommended)

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** at the top
3. Select **API key**
4. Your API key will be created and displayed
5. **Important**: Click "Restrict key" to secure it:
   - Under "API restrictions", select "Restrict key"
   - Choose "Google Drive API" from the list
   - Click "Save"
6. Copy the API key (you'll need it for your `.env` file)

### 1.4 Create Service Account (Method 2 - Optional)

If you need more advanced access (e.g., accessing private folders), you can use a service account:

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **Service account**
3. Enter a name for the service account (e.g., "drive-reader")
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"
6. Click on the created service account
7. Go to the **Keys** tab
8. Click **Add Key** > **Create new key**
9. Choose **JSON** format
10. Download the JSON file and save it securely in your project directory
11. **Important**: Add this file to `.gitignore` to avoid committing credentials

## Step 2: Set Up Google Drive Folder

### 2.1 Create or Select a Folder

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder or select an existing one for your images
3. Make sure the folder contains image files (JPEG, PNG, GIF, WebP, etc.)

### 2.2 Share Folder Publicly

1. Right-click on the folder
2. Select **Share**
3. Under "General access", click the dropdown
4. Select **Anyone with the link**
5. Set permission to **Viewer** (read-only)
6. Click **Done**

### 2.3 Get Folder ID

The folder ID is in the Google Drive URL. Here's how to find it:

1. Open the folder in Google Drive
2. Look at the URL in your browser
3. The URL format is: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
4. Copy the `FOLDER_ID_HERE` part (it's a long string of letters, numbers, and dashes)

**Example:**
- URL: `https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p`
- Folder ID: `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p`

## Step 3: Configure Backend

### 3.1 Install Dependencies

Install the required Python packages:

```bash
pip install -r backend/requirements.txt
```

Or install individually:

```bash
pip install google-api-python-client google-auth google-auth-oauthlib google-auth-httplib2
```

### 3.2 Set Environment Variables

Create a `.env` file in your project root (or update your existing one) with:

**Option 1: Using API Key (Recommended)**

```env
GOOGLE_DRIVE_API_KEY=your-api-key-here
```

**Option 2: Using Service Account**

```env
GOOGLE_DRIVE_CREDENTIALS_PATH=path/to/your-credentials.json
```

**Note:** You can use either method, but API key is simpler for public folders.

### 3.3 Verify Configuration

Make sure your `.env` file is in the project root and is being loaded by Django (the `settings.py` already uses `python-dotenv`).

## Step 4: Test the Integration

### 4.1 Start the Django Server

```bash
python manage.py runserver
```

### 4.2 Test the API Endpoints

**Get images from a folder:**
```bash
GET http://localhost:8000/api/google-drive/images/?folder_id=YOUR_FOLDER_ID
```

**Get folder information:**
```bash
GET http://localhost:8000/api/google-drive/folder-info/?folder_id=YOUR_FOLDER_ID
```

### 4.3 Example Response

```json
{
  "success": true,
  "count": 5,
  "folder_id": "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p",
  "images": [
    {
      "id": "file_id_1",
      "name": "photo1.jpg",
      "mimeType": "image/jpeg",
      "size": "2048576",
      "createdTime": "2024-01-15T10:30:00.000Z",
      "modifiedTime": "2024-01-15T10:30:00.000Z",
      "thumbnailLink": "https://...",
      "downloadLink": "https://drive.google.com/uc?export=download&id=...",
      "directLink": "https://drive.google.com/uc?export=view&id=..."
    }
  ]
}
```

## API Endpoints

### List Images from Folder

**Endpoint:** `GET /api/google-drive/images/`

**Query Parameters:**
- `folder_id` (required): The Google Drive folder ID

**Response:**
- Returns a list of all image files in the specified folder
- Each image includes metadata and direct download links

### Get Folder Information

**Endpoint:** `GET /api/google-drive/folder-info/`

**Query Parameters:**
- `folder_id` (required): The Google Drive folder ID

**Response:**
- Returns basic information about the folder (name, creation date, etc.)

## Supported Image Formats

The integration supports the following image formats:
- JPEG/JPG
- PNG
- GIF
- WebP
- BMP
- SVG

## Troubleshooting

### Error: "Google Drive service is not configured"

- Make sure you've set either `GOOGLE_DRIVE_API_KEY` or `GOOGLE_DRIVE_CREDENTIALS_PATH` in your `.env` file
- Restart your Django server after updating the `.env` file

### Error: "Folder not found or access denied"

- Verify the folder ID is correct
- Make sure the folder is shared publicly with "Anyone with the link" permission
- If using API key, ensure the Google Drive API is enabled in your Google Cloud project

### Error: "API key not valid"

- Check that your API key is correct
- Verify the API key is restricted to Google Drive API (if you set restrictions)
- Make sure the Google Drive API is enabled in your Google Cloud project

### Images not appearing

- Verify the folder contains image files
- Check that the files are actually images (not documents or other file types)
- Ensure the folder sharing settings allow public access

## Security Best Practices

1. **Never commit your API key or credentials file to version control**
   - Add `.env` to `.gitignore`
   - Add `credentials.json` to `.gitignore`

2. **Restrict your API key**
   - Limit it to only the Google Drive API
   - Optionally restrict by IP address for production

3. **Use environment variables**
   - Never hardcode credentials in your code
   - Use `.env` files for local development
   - Use secure environment variable storage in production (e.g., environment variables in your hosting platform)

4. **Service Account Permissions**
   - If using a service account, only grant the minimum permissions needed
   - The service account only needs read access to the Drive API

## Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/v3/about-sdk)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Drive API Python Quickstart](https://developers.google.com/drive/api/v3/quickstart/python)

## Notes

- The API key method is simpler and sufficient for accessing public folders
- Service accounts are useful if you need to access private folders or perform write operations
- The integration automatically handles pagination for folders with many files
- Image links are generated for direct viewing/downloading

