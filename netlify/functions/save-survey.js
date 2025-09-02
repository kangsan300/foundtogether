// netlify/functions/save-survey.js
// PostgreSQL 클라이언트 라이브러리를 불러옵니다.
const { Client } = require('pg');

/**
 * Netlify Functions의 메인 핸들러 함수입니다.
 * @description HTTP POST 요청을 처리하여 설문 데이터를 데이터베이스에 저장합니다.
 * @param {object} event - HTTP 요청에 대한 정보를 담고 있는 객체
 * @param {object} context - Netlify Functions의 실행 환경에 대한 정보를 담고 있는 객체
 * @returns {object} - HTTP 응답 객체 (성공 또는 실패 메시지 포함)
 */
exports.handler = async (event, context) => {
  // CORS(Cross-Origin Resource Sharing)를 위한 헤더를 설정합니다.
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  let client;
  
  try {
    if (!process.env.NETLIFY_DATABASE_URL) {
      throw new Error('NETLIFY_DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    }

    const { userName, userPhone, answers, analysisResult } = JSON.parse(event.body);
    
    if (!userName || !userPhone || !answers || !analysisResult) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '필수 데이터가 누락되었습니다.' })
      };
    }

    client = new Client({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    
    // 테이블이 없는 경우 일련번호 ID를 가진 테이블을 생성합니다.
    const createTableIfNotExists = `
      CREATE TABLE IF NOT EXISTS user_survey (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_name VARCHAR(100) NOT NULL,
        user_phone VARCHAR(20) NOT NULL,
        answers JSONB NOT NULL,
        analysis_result JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createTableIfNotExists);
    
    // 설문 데이터를 user_survey 테이블에 삽입하는 SQL 쿼리입니다.
    const query = `
      INSERT INTO user_survey (user_name, user_phone, answers, analysis_result)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `;
    
    const values = [
      userName, 
      userPhone, 
      JSON.stringify(answers), 
      JSON.stringify(analysisResult)
    ];
    
    const result = await client.query(query, values);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: '설문 데이터가 성공적으로 저장되었습니다!',
        id: result.rows[0].id,
        timestamp: result.rows[0].created_at
      })
    };
    
  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: '데이터 저장 중 오류가 발생했습니다.',
        error: error.message,
        code: error.code || 'UNKNOWN'
      })
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
