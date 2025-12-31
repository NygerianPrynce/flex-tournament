import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DesktopOnly } from '../components/DesktopOnly';
import {
  Layout,
  Typography,
  Button,
  Input,
  Form,
  Card,
  Space,
  message,
} from 'antd';
import {
  ArrowRightOutlined,
  TrophyOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

export function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        });

        if (signUpError) throw signUpError;

        // After signup, check if email confirmation is required
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.email_confirmed_at) {
          message.success('Account created! Please check your email to verify your account.');
        } else {
          // Email confirmation disabled or already confirmed, redirect to tournaments
          message.success('Account created successfully!');
          navigate('/tournaments');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (signInError) throw signInError;

        message.success('Signed in successfully!');
        navigate('/tournaments');
      }
    } catch (err: any) {
      // Provide more helpful error messages
      if (err.message?.includes('email')) {
        message.error('Email confirmation is required. Please check your email or disable email confirmation in Supabase settings.');
      } else if (err.message?.includes('Invalid login credentials')) {
        message.error('Invalid email or password. Please try again.');
      } else {
        message.error(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DesktopOnly>
      <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
          
          * {
            font-family: 'Poppins', sans-serif;
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .animate-fade-in-up {
            animation: fadeInUp 0.8s ease-out forwards;
          }
        `}</style>
        
        <Content style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '48px 24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Trophy Icons Background Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            opacity: 0.3,
          }}>
            {[
              // Top row
              { x: '8%', y: '5%', size: '32px', rotate: 15 },
              { x: '20%', y: '5%', size: '28px', rotate: 45 },
              { x: '32%', y: '5%', size: '30px', rotate: 75 },
              { x: '44%', y: '5%', size: '34px', rotate: 25 },
              { x: '56%', y: '5%', size: '28px', rotate: 55 },
              { x: '68%', y: '5%', size: '32px', rotate: 85 },
              { x: '80%', y: '5%', size: '30px', rotate: 115 },
              { x: '92%', y: '5%', size: '28px', rotate: 35 },
              // Second row
              { x: '5%', y: '18%', size: '30px', rotate: 65 },
              { x: '16%', y: '18%', size: '34px', rotate: 95 },
              { x: '27%', y: '18%', size: '28px', rotate: 125 },
              { x: '38%', y: '18%', size: '32px', rotate: 5 },
              { x: '49%', y: '18%', size: '30px', rotate: 45 },
              { x: '60%', y: '18%', size: '28px', rotate: 75 },
              { x: '71%', y: '18%', size: '34px', rotate: 105 },
              { x: '82%', y: '18%', size: '30px', rotate: 15 },
              { x: '93%', y: '18%', size: '28px', rotate: 55 },
              // Third row
              { x: '10%', y: '32%', size: '32px', rotate: 85 },
              { x: '22%', y: '32%', size: '28px', rotate: 25 },
              { x: '34%', y: '32%', size: '30px', rotate: 65 },
              { x: '46%', y: '32%', size: '34px', rotate: 95 },
              { x: '58%', y: '32%', size: '28px', rotate: 35 },
              { x: '70%', y: '32%', size: '32px', rotate: 75 },
              { x: '82%', y: '32%', size: '30px', rotate: 115 },
              { x: '94%', y: '32%', size: '28px', rotate: 5 },
              // Fourth row
              { x: '7%', y: '46%', size: '30px', rotate: 45 },
              { x: '18%', y: '46%', size: '34px', rotate: 85 },
              { x: '29%', y: '46%', size: '28px', rotate: 125 },
              { x: '40%', y: '46%', size: '32px', rotate: 15 },
              { x: '51%', y: '46%', size: '30px', rotate: 55 },
              { x: '62%', y: '46%', size: '28px', rotate: 95 },
              { x: '73%', y: '46%', size: '34px', rotate: 25 },
              { x: '84%', y: '46%', size: '30px', rotate: 65 },
              { x: '95%', y: '46%', size: '28px', rotate: 105 },
              // Fifth row
              { x: '12%', y: '60%', size: '32px', rotate: 35 },
              { x: '24%', y: '60%', size: '28px', rotate: 75 },
              { x: '36%', y: '60%', size: '30px', rotate: 115 },
              { x: '48%', y: '60%', size: '34px', rotate: 5 },
              { x: '60%', y: '60%', size: '28px', rotate: 45 },
              { x: '72%', y: '60%', size: '32px', rotate: 85 },
              { x: '84%', y: '60%', size: '30px', rotate: 125 },
              { x: '96%', y: '60%', size: '28px', rotate: 15 },
              // Sixth row
              { x: '9%', y: '74%', size: '30px', rotate: 55 },
              { x: '20%', y: '74%', size: '34px', rotate: 95 },
              { x: '31%', y: '74%', size: '28px', rotate: 25 },
              { x: '42%', y: '74%', size: '32px', rotate: 65 },
              { x: '53%', y: '74%', size: '30px', rotate: 105 },
              { x: '64%', y: '74%', size: '28px', rotate: 5 },
              { x: '75%', y: '74%', size: '34px', rotate: 45 },
              { x: '86%', y: '74%', size: '30px', rotate: 85 },
              { x: '97%', y: '74%', size: '28px', rotate: 125 },
              // Bottom row
              { x: '6%', y: '88%', size: '32px', rotate: 75 },
              { x: '17%', y: '88%', size: '28px', rotate: 115 },
              { x: '28%', y: '88%', size: '30px', rotate: 15 },
              { x: '39%', y: '88%', size: '34px', rotate: 55 },
              { x: '50%', y: '88%', size: '28px', rotate: 95 },
              { x: '61%', y: '88%', size: '32px', rotate: 25 },
              { x: '72%', y: '88%', size: '30px', rotate: 65 },
              { x: '83%', y: '88%', size: '28px', rotate: 105 },
              { x: '94%', y: '88%', size: '34px', rotate: 35 },
            ].map((trophy, index) => (
              <TrophyOutlined
                key={index}
                style={{
                  position: 'absolute',
                  left: trophy.x,
                  top: trophy.y,
                  fontSize: trophy.size,
                  transform: `rotate(${trophy.rotate}deg)`,
                  userSelect: 'none',
                  pointerEvents: 'none',
                  color: '#f97316',
                }}
              />
            ))}
          </div>

          <div style={{ 
            maxWidth: '480px', 
            width: '100%',
            position: 'relative',
            zIndex: 1
          }} className="animate-fade-in-up">
            <Card
              style={{
                borderRadius: '24px',
                border: 'none',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
              }}
              bodyStyle={{ padding: '48px' }}
            >
              {/* Logo and Title */}
              <Space direction="vertical" size={24} style={{ width: '100%', textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src="/favicon.png" 
                    alt="Bracketooski Logo" 
                    style={{ width: '56px', height: '56px' }}
                  />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>
                    Bracketooski
                  </Title>
                  <Text style={{ fontSize: '16px', color: '#6b7280', marginTop: '8px', display: 'block' }}>
                    {isSignUp ? 'Create your account to get started' : 'Welcome back! Sign in to continue'}
                  </Text>
                </div>
              </Space>

              {/* Form */}
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                size="large"
                requiredMark={false}
              >
                <Form.Item
                  name="email"
                  label={<Text style={{ fontWeight: 600, fontSize: '14px', color: '#374151' }}>Email</Text>}
                  rules={[
                    { required: true, message: 'Please enter your email' },
                    { type: 'email', message: 'Please enter a valid email' },
                  ]}
                >
                  <Input
                    placeholder="Enter your email"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #e5e7eb',
                      padding: '12px 16px',
                      fontSize: '15px',
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<Text style={{ fontWeight: 600, fontSize: '14px', color: '#374151' }}>Password</Text>}
                  rules={[
                    { required: true, message: 'Please enter your password' },
                    { min: 6, message: 'Password must be at least 6 characters' },
                  ]}
                >
                  <Input.Password
                    placeholder="Enter your password"
                    style={{
                      borderRadius: '12px',
                      border: '2px solid #e5e7eb',
                      padding: '12px 16px',
                      fontSize: '15px',
                    }}
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: '24px', marginTop: '32px' }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    icon={<ArrowRightOutlined />}
                    iconPosition="end"
                    style={{
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                      border: 'none',
                      fontSize: '16px',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                    }}
                  >
                    {isSignUp ? 'Create Account' : 'Sign In'}
                  </Button>
                </Form.Item>
              </Form>

              {/* Toggle Sign Up/Sign In */}
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Button
                    type="link"
                    onClick={() => {
                      setIsSignUp(!isSignUp);
                      form.resetFields();
                    }}
                    style={{
                      color: '#f97316',
                      fontWeight: 600,
                      padding: 0,
                      height: 'auto',
                    }}
                  >
                    {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </Button>
                  <Link
                    to="/"
                    style={{
                      color: '#6b7280',
                      fontSize: '14px',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    ← Back to home
                  </Link>
                </Space>
              </div>
            </Card>
          </div>
        </Content>
      </Layout>
    </DesktopOnly>
  );
}
