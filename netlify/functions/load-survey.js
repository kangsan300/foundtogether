// netlify/functions/load-survey.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }
  
  let client;

  try {
    if (!process.env.NETLIFY_DATABASE_URL) {
      throw new Error('NETLIFY_DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    }

    client = new Client({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    
    const query = `
      SELECT id, user_name, user_phone, answers, analysis_result, created_at 
      FROM user_survey 
      ORDER BY created_at DESC
    `;
    const res = await client.query(query);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(res.rows)
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Failed to load survey data.', error: error.message })
    };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};
