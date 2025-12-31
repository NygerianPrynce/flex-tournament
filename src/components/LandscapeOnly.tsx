import { useEffect, useState } from 'react';
import { Layout, Typography, Card } from 'antd';
import { MobileOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text } = Typography;

export function LandscapeOnly({ children }: { children: React.ReactNode }) {
  const [isLandscape, setIsLandscape] = useState(() => {
    // Initialize based on current orientation
    if (typeof window !== 'undefined') {
      return window.innerWidth > window.innerHeight;
    }
    return true;
  });

  useEffect(() => {
    const checkOrientation = () => {
      // Check if window width > height (landscape)
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    // Handle orientation change with a small delay to allow the orientation to update
    const handleOrientationChange = () => {
      setTimeout(checkOrientation, 100);
    };

    // Check immediately on mount
    checkOrientation();

    // Listen for resize events (handles orientation changes and window resizing)
    window.addEventListener('resize', checkOrientation);
    
    // Listen for orientation change events (mobile devices)
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  if (!isLandscape) {
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
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)',
                transform: 'rotate(-90deg)'
              }}>
                <MobileOutlined style={{ fontSize: '40px', color: '#fff' }} />
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
              Please Rotate Your Device
            </Title>
            <Text style={{ 
              fontSize: '16px', 
              color: '#6b7280',
              lineHeight: 1.6,
              display: 'block'
            }}>
              This tournament viewer is optimized for landscape mode. Please rotate your phone to view the tournament.
            </Text>
          </Card>
        </Content>
      </Layout>
    );
  }

  return <>{children}</>;
}
