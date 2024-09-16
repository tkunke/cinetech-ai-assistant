// Import necessary modules
import OpenAI, { APIError } from 'openai';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';  // Use Node.js fs module for reading JSON files
import path from 'path';  // For handling file paths correctly

// Initialize OpenAI with your API key
const openai = new OpenAI();

interface AssistantData {
  name: string;
  instructions: string;
  tools: any[];
  model: string;
}

export async function POST(req: Request) {
  try {
    // Step 1: Parse the request body for the assistant name
    const { assistantName } = await req.json();

    if (!assistantName) {
      return NextResponse.json({
        success: false,
        error: "Assistant name is required."
      }, { status: 400 });
    }

    // Step 2: Load instructions from JSON file
    const instructionsPath = path.resolve('src/app/assistant_instructions.json');
    const instructionsData = await fs.readFile(instructionsPath, 'utf-8');
    const { instructions } = JSON.parse(instructionsData);  // Get the instructions string

    // Step 3: Hardcode tools for simplicity
    const tools = [
      {
        "type": "file_search"
      },
      {
        "type": "function",
        "function": {
          "name": "generateImage",
          "parameters": {
            "type": "object",
            "properties": {
              "content": {
                "type": "string",
                "description": "The user's prompt to generate an image"
              }
            },
            "required": ["content"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "alternateImage",
          "parameters": {
            "type": "object",
            "properties": {
              "content": {
                "type": "string",
                "description": "The user's prompt to generate an alternate image"
              }
            },
            "required": ["content"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "performBingSearch",
          "parameters": {
            "type": "object",
            "properties": {
              "user_request": {
                "type": "string",
                "description": "The user's request to generate a search query for Bing"
              }
            },
            "required": ["user_request"]
          }
        }
      },
      {
        "type": "function",
        "function": {
          "name": "imageRecognition",
          "parameters": {
            "type": "object",
            "properties": {
              "content": {
                "type": "string",
                "description": "The user's prompt to recognize an image"
              }
            },
            "required": ["content"]
          }
        }
      }
    ];

    // Step 4: Create the assistant
    const assistantData: AssistantData = {
      instructions,  // Include the instructions string from the JSON file
      name: assistantName,
      tools,
      model: "gpt-4o",  // Specify the model
    };

    const assistant = await openai.beta.assistants.create(assistantData);
    console.log("Assistant created successfully:", assistant);

    // Step 5: List available vector stores
    const vectorStores = await openai.beta.vectorStores.list();
    console.log("Available Vector Stores:", vectorStores);

    // Step 6: Search for "Cinetech_Master_Store" in the list of vector stores
    const cinetechMasterStore = vectorStores.data.find(
      (store: { name: string }) => store.name === "cinetech_master_store"
    );

    if (!cinetechMasterStore) {
      return NextResponse.json({
        success: false,
        error: "Vector store 'cinetech_master_store' not found."
      }, { status: 404 });
    }

    // Step 7: Attach the vector store to the assistant
    await openai.beta.assistants.update(assistant.id, {
      tool_resources: {
        file_search: {
          vector_store_ids: [cinetechMasterStore.id],
        },
      },
    });

    console.log("Vector store attached to the assistant:", cinetechMasterStore.id);

    return NextResponse.json({ success: true, assistant, vectorStoreId: cinetechMasterStore.id }, { status: 200 });
  } catch (error) {
    if (error instanceof APIError) {
      console.error("API Error:", error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    } else {
      console.error("Unexpected Error:", error);
      return NextResponse.json({ success: false, error: 'Unexpected error occurred.' }, { status: 500 });
    }
  }
}
