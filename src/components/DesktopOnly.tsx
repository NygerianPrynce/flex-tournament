import { useEffect, useState } from 'react';
import { Layout, Typography, Card } from 'antd';
import { DesktopOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

export function DesktopOnly({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const width = window.innerWidth;
      
      // Check if it's an iPad (modern iPads report as MacIntel with touch)
      const isIPad = /iPad/.test(userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Check if it's a mobile phone (but not iPad)
      const isMobilePhone = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) &&
                           !isIPad;
      
      // Check screen width (desktops typically have width >= 1024px)
      // Allow iPad even if width is smaller (iPad mini, etc.)
      const isLargeScreen = width >= 1024;
      
      // Desktop/iPad if: iPad OR (not mobile phone AND large screen)
      setIsDesktop(isIPad || (!isMobilePhone && isLargeScreen));
    };

    // Check on mount
    checkDevice();

    // Listen for resize events
    window.addEventListener('resize', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  if (!isDesktop) {
    return (
      <Layout style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
          * {
            font-family: 'Poppins', sans-serif;
          }
        `}</style>
        {/* Background Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23f97316\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
          }}
        />
        <Content style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '24px',
          position: 'relative',
          zIndex: 1
        }}>
          <Card
            style={{
              maxWidth: '500px',
              width: '100%',
              background: '#fff',
              borderRadius: '24px',
              border: 'none',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
              textAlign: 'center'
            }}
            bodyStyle={{ padding: '48px 32px' }}
          >
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)'
              }}>
                <DesktopOutlined style={{ fontSize: '40px', color: '#fff' }} />
              </div>
            </div>
            <Title 
              level={2} 
              style={{ 
                margin: '0 0 16px 0', 
                fontSize: '28px', 
                fontWeight: 700,
                color: '#1f2937'
              }}
            >
              Please Use a Desktop or iPad
            </Title>
            <Text style={{ 
              fontSize: '16px', 
              color: '#6b7280',
              lineHeight: 1.6,
              display: 'block',
              marginBottom: '12px'
            }}>
              Tournament management requires a larger screen. Please use a desktop computer or iPad to sign in or sign up.
            </Text>
            <Text style={{ 
              fontSize: '14px', 
              color: '#9ca3af',
              display: 'block'
            }}>
              Mobile devices can view tournaments using the share code on the landing page.
            </Text>
          </Card>
        </Content>
      </Layout>
    );
  }

  return <>{children}</>;
}
