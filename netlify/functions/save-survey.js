// netlify/functions/save-survey.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  const { userName, userPhone, answers, analysisResult } = JSON.parse(event.body);

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    // Using a parameterized query to prevent SQL injection
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
      body: JSON.stringify({ message: 'Failed to save survey data.', error: error.message })
    };
  } finally {
    await client.end();
  }
};
```js
// netlify/functions/load-survey.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    
    const query = `
      SELECT id, user_name, user_phone, answers, analysis_result, created_at 
      FROM user_survey 
      ORDER BY created_at DESC
    `;
    const res = await client.query(query);

    return {
      statusCode: 200,
      body: JSON.stringify(res.rows)
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to load survey data.', error: error.message })
    };
  } finally {
    await client.end();
  }
};