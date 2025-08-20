const { Client } = require('pg');

exports.handler = async (event, context) => {
  console.log('Load function called:', event.httpMethod);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let client;
  
  try {
    // 환경 변수 확인
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('Connecting to database...');
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('Database connected successfully');
    
    // 먼저 테이블 존재 여부 확인
    const tableCheck = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_survey'
      );
    `;
    
    const tableExists = await client.query(tableCheck);
    console.log('Table exists:', tableExists.rows[0].exists);
    
    if (!tableExists.rows[0].exists) {
      // 테이블이 없으면 생성
      const createTable = `
        CREATE TABLE user_survey (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_name VARCHAR(100) NOT NULL,
          user_phone VARCHAR(20) NOT NULL,
          answers JSONB NOT NULL,
          analysis_result JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await client.query(createTable);
      console.log('Table created successfully');
    }
    
    // 데이터 조회
    const query = `
      SELECT id, user_name, user_phone, answers, analysis_result, created_at 
      FROM user_survey 
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    console.log('Executing query...');
    const res = await client.query(query);
    console.log('Data loaded successfully, rows:', res.rows.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(res.rows)
    };
    
  } catch (error) {
    console.error('Load function error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to load survey data.', 
        error: error.message,
        code: error.code
      })
    };
  } finally {
    if (client) {
      try {
        await client.end();
        console.log('Database connection closed');
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};