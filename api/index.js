export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  try {
    const response = await fetch(
      "https://api.replicate.com/v1/predictions",
      {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          version: "db21e45d3f7023abc9e53c85b0b0c9c22203a8d7cb15faef5527a361c4e7c59d",
          input: { prompt: prompt }
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Replicate error: ${data.detail || response.status}`);
    }

    // Poll for result
    let prediction = data;
    while (prediction.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: { "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}` }
        }
      );
      prediction = await pollResponse.json();
    }

    if (prediction.status !== 'succeeded') {
      throw new Error('Prediction failed');
    }

    const imageUrl = prediction.output[0];
    const imageResponse = await fetch(imageUrl);
    const buffer = await imageResponse.arrayBuffer();
    
    res.setHeader('Content-Type', 'image/png');
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

