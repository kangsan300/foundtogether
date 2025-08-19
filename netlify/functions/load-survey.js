const { Client } = require('pg');

exports.handler = async (event) => {
  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL
  });

  try {
    await client.connect();
    const query = 'SELECT user_name, user_phone, answers, analysis_result, created_at FROM user_survey ORDER BY created_at DESC';
    const res = await client.query(query);

    return {
      statusCode: 200,
      body: JSON.stringify(res.rows)
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to load survey data.' })
    };
  } finally {
    await client.end();
  }
};
