import OpenAI from "openai";

const openai = new OpenAI();

export const deleteAssistant = async (assistantId: string) => {
  try {
    const response = await openai.beta.assistants.del(assistantId);

    console.log('Assistant deleted:', response); // Check the structure of the response

    // If there is no 'success' property, handle based on response content
    if (response) {
      console.log(`Assistant with ID ${assistantId} deleted successfully.`);
    } else {
      console.error('Failed to delete assistant.');
    }

  } catch (error) {
    console.error('Error deleting assistant:', error);
    throw error;
  }
};
