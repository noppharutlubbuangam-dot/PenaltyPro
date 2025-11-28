
// ==========================================
// COPY THIS CODE TO YOUR GOOGLE APPS SCRIPT (Code.gs)
// ==========================================

// --- CONFIGURATION ---
// IMPORTANT: Go to Project Settings -> Script Properties -> Add 'GEMINI_API_KEY'
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

// --- DO NOT EDIT BELOW THIS LINE UNLESS YOU KNOW WHAT YOU ARE DOING ---

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'aiGenerate') {
      return handleAIGeneration(data);
    }
    
    // ... (Your other existing logic for saveMatch, register, etc. should be here) ...
    // This example only shows the AI part. Ensure you merge this with your full script.
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleAIGeneration(data) {
  if (!GEMINI_API_KEY) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'API Key not configured in Script Properties' })).setMimeType(ContentService.MimeType.JSON);
  }

  // Use the model passed from frontend, or default to 2.5 flash
  const model = data.model || 'gemini-2.5-flash';
  const prompt = data.prompt;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    "contents": [
      {
        "parts": [
          { "text": prompt }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 800
    }
  };

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true // Important to catch 4xx/5xx errors without crashing
  };

  try {
    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    const json = JSON.parse(responseText);

    if (responseCode !== 200) {
      // Handle Google API Errors (Quota, Invalid Model, etc.)
      const errorMessage = json.error ? json.error.message : responseText;
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: `AI Error (${model}): ${errorMessage}` 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Extract text from Gemini response
    let generatedText = "";
    if (json.candidates && json.candidates.length > 0 && json.candidates[0].content && json.candidates[0].content.parts) {
      generatedText = json.candidates[0].content.parts[0].text;
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      text: generatedText 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: `Script Execution Error: ${e.toString()}` 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function testAuth() {
  console.log("Authorization Test Successful");
}
