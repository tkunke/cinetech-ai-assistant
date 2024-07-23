import axios from 'axios';
import FormData from 'form-data';
import { put } from '@vercel/blob';

type PayloadType = {
  prompt: string;
  output_format: string;
  steps: number;
  width: number;
  height: number;
  seed: number;
  cfg_scale: number;
  samples: number;
  text_prompts: { text: string; weight: number }[];
};

export async function generateImageFromStability(content: string): Promise<string | null> {
  console.log('Assistant prompt:', content);

  const url = "https://api.stability.ai/v2beta/stable-image/generate/ultra";

  const payload: PayloadType = {
    prompt: content,
    output_format: "webp",
    steps: 40,
    width: 1024,
    height: 1024,
    seed: 0,
    cfg_scale: 5,
    samples: 1,
    text_prompts: [
      {
        text: content,
        weight: 1,
      },
    ],
  };

  console.log('Payload created.');

  const formData = new FormData();
  formData.append('prompt', payload.prompt);
  formData.append('output_format', payload.output_format);
  formData.append('steps', payload.steps.toString());
  formData.append('width', payload.width.toString());
  formData.append('height', payload.height.toString());
  formData.append('seed', payload.seed.toString());
  formData.append('cfg_scale', payload.cfg_scale.toString());
  formData.append('samples', payload.samples.toString());

  payload.text_prompts.forEach((prompt, index) => {
    formData.append(`text_prompts[${index}][text]`, prompt.text);
    formData.append(`text_prompts[${index}][weight]`, prompt.weight.toString());
  });

  console.log('FormData created.');

  const headers = {
    Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
    Accept: "image/*",
    ...formData.getHeaders(),
  };

  console.log('Headers set.');

  try {
    console.log('Making API call to Stability AI...');
    const response = await axios.post(url, formData, {
      headers: headers,
      responseType: 'arraybuffer',
      validateStatus: undefined,
    });

    console.log('Response status:', response.status);

    if (response.status !== 200) {
      console.error('Error response:', response.data.toString());
      throw new Error(`Error: ${response.status} - ${response.data.toString()}`);
    }

    const imageBuffer = Buffer.from(response.data);
    const imageBase64 = imageBuffer.toString('base64');

    // Upload the image to Vercel Blob
    const fileName = `stability-tmp-img_${Date.now()}.webp`;
    const blob = await put(fileName, Buffer.from(imageBase64, 'base64'), {
      access: 'public',
    });

    console.log('Generated Image URL:', blob.url);
    return blob.url;
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}