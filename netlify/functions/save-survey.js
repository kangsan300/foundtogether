const { Client } = require('pg');

exports.handler = async (event) => {
  const body = JSON.parse(event.body);
  const { userName, userPhone, answers, analysisResult } = body;

  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL
  });

  try {
    await client.connect();
    const query = `
      INSERT INTO user_survey (user_name, user_phone, answers, analysis_result)
      VALUES ($1, $2, $3, $4)
    `;
    const values = [userName, userPhone, JSON.stringify(answers), JSON.stringify(analysisResult)];
    await client.query(query, values);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Survey data saved successfully!' })
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to save survey data.' })
    };
  } finally {
    await client.end();
  }
};
