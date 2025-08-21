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
  // 이 설정을 통해 다른 도메인의 웹사이트에서도 이 함수를 호출할 수 있습니다.
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // 클라이언트에서 미리 요청을 보내는 OPTIONS 메소드에 대한 응답입니다.
  // 이 응답을 통해 브라우저는 실제 POST 요청을 보낼 수 있습니다.
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // POST 요청이 아니면 405 Method Not Allowed 에러를 반환합니다.
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  let client;
  
  try {
    // 환경 변수 NETLIFY_DATABASE_URL이 설정되었는지 확인합니다.
    // 이 변수가 없으면 데이터베이스에 연결할 수 없으므로 에러를 발생시킵니다.
    if (!process.env.NETLIFY_DATABASE_URL) {
      throw new Error('NETLIFY_DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    }

    // 요청 본문(body)의 JSON 데이터를 파싱하여 변수에 할당합니다.
    const { userName, userPhone, answers, analysisResult } = JSON.parse(event.body);
    
    // 필수 데이터가 누락되었는지 확인하고, 누락 시 400 Bad Request 에러를 반환합니다.
    if (!userName || !userPhone || !answers || !analysisResult) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: '필수 데이터가 누락되었습니다.' })
      };
    }

    // Netlify 환경 변수 NETLIFY_DATABASE_URL을 사용하여 PostgreSQL 클라이언트를 생성합니다.
    // 이 환경 변수는 Netlify 프로젝트 설정에서 직접 등록해야 합니다.
    client = new Client({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      // Netlify 환경에서 SSL 연결 문제를 해결하기 위한 설정입니다.
      ssl: {
        rejectUnauthorized: false
      }
    });

    // 데이터베이스에 연결합니다.
    await client.connect();
    
    // user_survey 테이블에 데이터를 삽입하는 SQL 쿼리입니다.
    // $1, $2, $3, $4는 SQL 인젝션을 방지하기 위한 매개변수입니다.
    const query = `
      INSERT INTO user_survey (user_name, user_phone, answers, analysis_result)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `;
    
    // INSERT 쿼리에 들어갈 값들을 배열로 정의합니다.
    const values = [
      userName, 
      userPhone, 
      JSON.stringify(answers), 
      JSON.stringify(analysisResult)
    ];
    
    // 쿼리를 실행하여 데이터를 저장합니다.
    const result = await client.query(query, values);

    // 데이터 저장 성공 시 200 상태 코드와 성공 메시지를 반환합니다.
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
    // 데이터베이스 작업 중 오류가 발생하면 상세 에러를 기록하고 실패 메시지를 반환합니다.
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: '데이터 저장 중 오류가 발생했습니다.',
        error: error.message, // 상세 오류 메시지를 반환하여 디버깅을 돕습니다.
        code: error.code || 'UNKNOWN'
      })
    };
  } finally {
    // try-catch 블록이 끝나면 데이터베이스 연결을 항상 종료합니다.
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};