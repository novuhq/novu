import { Row, Col, Result, Button } from 'antd';
import { Link, useParams } from 'react-router-dom';

import { useEffect, useState } from 'react';
import { AuthLayout } from '../../components/layout/LoginLayout';
import { PasswordRequestResetForm } from '../../components/auth/PasswordResetRequestForm';
import { PasswordResetForm } from '../../components/auth/PasswordResetForm';

export default function PasswordResetPage() {
  const { token } = useParams<{ token: string }>();
  const [showSentSuccess, setShowSentSuccess] = useState<boolean>();

  function onSent() {
    setShowSentSuccess(true);
  }

  return (
    <AuthLayout>
      <div className="h-100 bg-white">
        <Row justify="center" className="align-items-stretch h-100">
          <Col xs={20} sm={20} md={24} lg={16}>
            <div className="container d-flex flex-column justify-content-center h-100">
              <Row justify="center">
                {!showSentSuccess && !token && (
                  <Col xs={24} sm={24} md={20} lg={12} xl={8}>
                    <h1>Password Reset</h1>
                    <p>
                      Know your password?
                      <Link to="/auth/login">
                        <a> Login</a>
                      </Link>
                    </p>
                    <div className="mt-4">
                      <PasswordRequestResetForm onSent={onSent} />
                    </div>
                  </Col>
                )}
                {!showSentSuccess && token && (
                  <Col xs={24} sm={24} md={20} lg={12} xl={8}>
                    <h1>Password Reset</h1>

                    <div className="mt-4">
                      <PasswordResetForm token={token} />
                    </div>
                  </Col>
                )}

                {showSentSuccess && (
                  <Col xs={24} sm={24} md={20} lg={16} xl={12}>
                    <Result
                      status="success"
                      title="Reset sent"
                      subTitle="We've sent a password reset link to the account associated with your email."
                      extra={[
                        <Link to="/auth/login">
                          <Button type="primary" key="console" data-test-id="success-screen-reset">
                            Go back
                          </Button>
                        </Link>,
                      ]}
                    />
                  </Col>
                )}
              </Row>
            </div>
          </Col>
          <Col xs={0} sm={0} md={0} lg={8}>
            <div
              className="d-flex flex-column justify-content-between h-100 px-4"
              style={{
                backgroundImage: `url('/static/images/login_bg.png')`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
              }}>
              <div className="text-right">
                <img src="/static/images/logo.png" alt="logo" style={{ maxWidth: 150 }} />
              </div>
              <Row justify="center">
                <Col xs={0} sm={0} md={0} lg={20}>
                  <img className="img-fluid mb-5" src="/static/images/login_illustration.svg" alt="" />
                  <h1 className="text-white">Welcome to notifire</h1>
                  <p className="text-white">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus ullamcorper nisl erat, vel
                    convallis elit fermentum pellentesque.
                  </p>
                </Col>
              </Row>
              <div className="d-flex justify-content-end pb-4">
                <div>
                  <a className="text-white" href="/#" onClick={(e) => e.preventDefault()}>
                    Term & Conditions
                  </a>
                  <span className="mx-2 text-white"> | </span>
                  <a className="text-white" href="/#" onClick={(e) => e.preventDefault()}>
                    Privacy & Policy
                  </a>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </AuthLayout>
  );
}
