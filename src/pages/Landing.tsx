import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Layout,
  Typography,
  Button,
  Input,
  Form,
  Card,
  Row,
  Col,
  Space,
  Badge,
  Tabs,
} from 'antd';
import {
  ArrowRightOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import ReactFlowTournamentBracket from '../components/ReactFlowTournamentBracket';
import { CourtsManagementDemo } from '../components/CourtsManagementDemo';
import { BracketEditorDemo } from '../components/BracketEditorDemo';
import type { Tournament, Team, Game, Bracket } from '../types';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

// Demo tournament data - 16 teams, single elimination, in semi-final stage
const createDemoTournament = (): Tournament => {
  const teams: Team[] = Array.from({ length: 16 }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${String.fromCharCode(65 + i)}`, // Team A, Team B, etc.
    seed: i + 1,
  }));

  // Round 1 (8 games) - All finished
  const round1: Game[] = [
    { id: 'game-1-0', bracketType: 'W', round: 1, matchNumber: 0, teamA: { type: 'Team', teamId: 'team-1' }, teamB: { type: 'Team', teamId: 'team-16' }, scheduledOrder: 0, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-1', scoreA: 85, scoreB: 72, finishedAt: Date.now() - 3600000, teamAName: 'Team A', teamBName: 'Team P' } },
    { id: 'game-1-1', bracketType: 'W', round: 1, matchNumber: 1, teamA: { type: 'Team', teamId: 'team-8' }, teamB: { type: 'Team', teamId: 'team-9' }, scheduledOrder: 1, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-9', scoreA: 68, scoreB: 75, finishedAt: Date.now() - 3500000, teamAName: 'Team H', teamBName: 'Team I' } },
    { id: 'game-1-2', bracketType: 'W', round: 1, matchNumber: 2, teamA: { type: 'Team', teamId: 'team-4' }, teamB: { type: 'Team', teamId: 'team-13' }, scheduledOrder: 2, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-4', scoreA: 92, scoreB: 78, finishedAt: Date.now() - 3400000, teamAName: 'Team D', teamBName: 'Team M' } },
    { id: 'game-1-3', bracketType: 'W', round: 1, matchNumber: 3, teamA: { type: 'Team', teamId: 'team-5' }, teamB: { type: 'Team', teamId: 'team-12' }, scheduledOrder: 3, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-12', scoreA: 71, scoreB: 88, finishedAt: Date.now() - 3300000, teamAName: 'Team E', teamBName: 'Team L' } },
    { id: 'game-1-4', bracketType: 'W', round: 1, matchNumber: 4, teamA: { type: 'Team', teamId: 'team-2' }, teamB: { type: 'Team', teamId: 'team-15' }, scheduledOrder: 4, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-2', scoreA: 95, scoreB: 65, finishedAt: Date.now() - 3200000, teamAName: 'Team B', teamBName: 'Team O' } },
    { id: 'game-1-5', bracketType: 'W', round: 1, matchNumber: 5, teamA: { type: 'Team', teamId: 'team-7' }, teamB: { type: 'Team', teamId: 'team-10' }, scheduledOrder: 5, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-7', scoreA: 82, scoreB: 70, finishedAt: Date.now() - 3100000, teamAName: 'Team G', teamBName: 'Team J' } },
    { id: 'game-1-6', bracketType: 'W', round: 1, matchNumber: 6, teamA: { type: 'Team', teamId: 'team-3' }, teamB: { type: 'Team', teamId: 'team-14' }, scheduledOrder: 6, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-3', scoreA: 89, scoreB: 76, finishedAt: Date.now() - 3000000, teamAName: 'Team C', teamBName: 'Team N' } },
    { id: 'game-1-7', bracketType: 'W', round: 1, matchNumber: 7, teamA: { type: 'Team', teamId: 'team-6' }, teamB: { type: 'Team', teamId: 'team-11' }, scheduledOrder: 7, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-6', scoreA: 77, scoreB: 73, finishedAt: Date.now() - 2900000, teamAName: 'Team F', teamBName: 'Team K' } },
  ];

  // Round 2 (Quarter Finals - 4 games) - All finished
  const round2: Game[] = [
    { id: 'game-2-0', bracketType: 'W', round: 2, matchNumber: 0, teamA: { type: 'Team', teamId: 'team-1' }, teamB: { type: 'Team', teamId: 'team-9' }, scheduledOrder: 0, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-1', scoreA: 88, scoreB: 80, finishedAt: Date.now() - 1800000, teamAName: 'Team A', teamBName: 'Team I' } },
    { id: 'game-2-1', bracketType: 'W', round: 2, matchNumber: 1, teamA: { type: 'Team', teamId: 'team-4' }, teamB: { type: 'Team', teamId: 'team-12' }, scheduledOrder: 1, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-4', scoreA: 91, scoreB: 85, finishedAt: Date.now() - 1700000, teamAName: 'Team D', teamBName: 'Team L' } },
    { id: 'game-2-2', bracketType: 'W', round: 2, matchNumber: 2, teamA: { type: 'Team', teamId: 'team-2' }, teamB: { type: 'Team', teamId: 'team-7' }, scheduledOrder: 2, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-2', scoreA: 94, scoreB: 79, finishedAt: Date.now() - 1600000, teamAName: 'Team B', teamBName: 'Team G' } },
    { id: 'game-2-3', bracketType: 'W', round: 2, matchNumber: 3, teamA: { type: 'Team', teamId: 'team-3' }, teamB: { type: 'Team', teamId: 'team-6' }, scheduledOrder: 3, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-3', scoreA: 87, scoreB: 81, finishedAt: Date.now() - 1500000, teamAName: 'Team C', teamBName: 'Team F' } },
  ];

  // Round 3 (Semi Finals - 2 games) - One finished, one live
  const round3: Game[] = [
    { id: 'game-3-0', bracketType: 'W', round: 3, matchNumber: 0, teamA: { type: 'Team', teamId: 'team-1' }, teamB: { type: 'Team', teamId: 'team-4' }, scheduledOrder: 0, status: 'Finished', timers: { warmupRemaining: 0, gameRemaining: 0, flexRemaining: 0, currentPhase: 'idle', totalPausedTime: 0 }, result: { winnerId: 'team-1', scoreA: 96, scoreB: 89, finishedAt: Date.now() - 600000, teamAName: 'Team A', teamBName: 'Team D' } },
    { id: 'game-3-1', bracketType: 'W', round: 3, matchNumber: 1, teamA: { type: 'Team', teamId: 'team-2' }, teamB: { type: 'Team', teamId: 'team-3' }, scheduledOrder: 1, status: 'Live', timers: { warmupRemaining: 0, gameRemaining: 420, flexRemaining: 300, currentPhase: 'game', startedAt: Date.now() - 1200000, totalPausedTime: 0 } },
  ];

  // Round 4 (Final - 1 game) - Queued, waiting for semi-final to finish
  const round4: Game[] = [
    { id: 'game-4-0', bracketType: 'W', round: 4, matchNumber: 0, teamA: { type: 'Team', teamId: 'team-1' }, teamB: { type: 'OPEN' }, scheduledOrder: 0, status: 'Queued', timers: { warmupRemaining: 300, gameRemaining: 2400, flexRemaining: 300, currentPhase: 'idle', totalPausedTime: 0 } },
  ];

  const bracket: Bracket = {
    winners: [round1, round2, round3, round4],
    losers: [],
  };

  return {
    id: 'demo-tournament',
    name: 'YMCA Hoops',
    createdAt: Date.now() - 7200000,
    updatedAt: Date.now(),
    teams,
    refs: [],
    courts: [],
    bracket,
    settings: {
      sport: 'basketball',
      gameLengthMinutes: 40,
      warmupMinutes: 5,
      flexMinutes: 5,
      numberOfCourts: 4,
      courtNames: ['Court 1', 'Court 2', 'Court 3', 'Court 4'],
      includeLosersBracket: false,
      openSlotPolicy: 'BYE',
      useRefs: false,
      refereesPerGame: 0,
    },
    seedingMode: 'manual',
    seedingType: 'standard',
  };
};

export function Landing() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const demoTournament = useMemo(() => createDemoTournament(), []);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/tournaments');
      }
    });
  }, [navigate]);
  
  const handleViewTournament = (values: { shareCode: string }) => {
    const code = values.shareCode.trim().toUpperCase();
    
    if (!code) {
      form.setFields([{ name: 'shareCode', errors: ['Please enter a share code'] }]);
      return;
    }
    
    if (code.length !== 6) {
      form.setFields([{ name: 'shareCode', errors: ['Share code must be 6 characters'] }]);
      return;
    }
    
    // Navigate to viewer mode
    navigate(`/view/${code}`);
  };
  
  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
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
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .animate-fade-in {
          animation: fadeIn 1s ease-out forwards;
        }
        
        .animate-slide-in-right {
          animation: slideInRight 0.8s ease-out forwards;
        }
        
        .stagger-1 { animation-delay: 0.1s; opacity: 0; }
        .stagger-2 { animation-delay: 0.2s; opacity: 0; }
        .stagger-3 { animation-delay: 0.3s; opacity: 0; }
        .stagger-4 { animation-delay: 0.4s; opacity: 0; }
        .stagger-5 { animation-delay: 0.5s; opacity: 0; }
        
        .nav-link {
          position: relative;
          cursor: pointer;
          transition: color 0.3s;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
          font-size: 15px;
        }
        
        .nav-link:hover {
          color: #fff;
        }
        
        .feature-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
        }
      `}</style>

      {/* Header */}
      <Header
        style={{
          background: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '0 24px',
          height: '80px',
          lineHeight: '80px',
        }}
        className="landing-header"
      >
        <style>{`
          @media (max-width: 768px) {
            .landing-header {
              padding: 0 16px !important;
              height: 64px !important;
              line-height: 64px !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              width: 100% !important;
            }
            .nav-links-desktop {
              display: none !important;
            }
            .header-logo-text {
              font-size: 18px !important;
            }
            .header-logo-img {
              width: 32px !important;
              height: 32px !important;
            }
            .header-sign-in-btn {
              height: 32px !important;
              padding: 0 12px !important;
              font-size: 12px !important;
              border-radius: 16px !important;
            }
            .header-sign-in-btn .anticon {
              display: none !important;
            }
            .header-container {
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
            }
            .header-right-section {
              align-items: flex-start !important;
              padding-top: 2px !important;
            }
            .header-logo-section {
              padding-top: 14px !important;
            }
          }
        `}</style>
        <div className="header-container" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <Space align="center" size={12} className="header-logo-section">
            <img 
              src="/favicon.png" 
              alt="Bracketooski Logo" 
              className="header-logo-img"
              style={{ width: '40px', height: '40px' }}
            />
            <Title level={3} className="header-logo-text" style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '24px' }}>
              Bracketooski
            </Title>
          </Space>
          <div className="header-right-section" style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
            <Space size={40} className="nav-links-desktop">
              <span 
                className="nav-link" 
                onClick={() => {
                  const element = document.getElementById('demo');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                Demo
              </span>
              <span 
                className="nav-link" 
                onClick={() => {
                  const element = document.getElementById('features');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                Features
              </span>
              <span 
                className="nav-link" 
                onClick={() => {
                  const element = document.getElementById('why-us');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                Why Us
              </span>
            </Space>
            <Link to="/login">
              <Button 
                type="primary"
                icon={<ArrowRightOutlined />}
                className="header-sign-in-btn"
                style={{ 
                  background: '#f97316',
                  borderColor: '#f97316',
                  color: '#fff',
                  height: '44px',
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  borderRadius: '22px',
                  fontWeight: 600,
                  fontSize: '15px'
                }}
              >
                Sign In / Sign Up
              </Button>
          </Link>
          </div>
        </div>
      </Header>

      {/* Hero Section */}
      <Content>
        <div
          style={{
            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
            minHeight: '90vh',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23f97316\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
          }}
        >
          {/* Stadium background overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'linear-gradient(135deg, rgba(31, 41, 55, 0.95) 0%, rgba(17, 24, 39, 0.9) 100%)',
              backgroundBlendMode: 'multiply',
            }}
          />
          
          {/* Gradient Orb */}
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              right: '-5%',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(60px)',
            }}
          />
          
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', padding: '120px 48px 80px', width: '100%' }} className="hero-container">
            <style>{`
              @media (max-width: 768px) {
                .hero-container {
                  padding-top: 100px !important;
                }
              }
            `}</style>
            <style>{`
              @media (max-width: 768px) {
                .hero-container {
                  padding: 100px 24px 60px !important;
                }
                .hero-title {
                  font-size: 2rem !important;
                  line-height: 1.2 !important;
                }
                .hero-description {
                  font-size: 1rem !important;
                }
                .hero-cta-btn {
                  height: 48px !important;
                  padding: 0 24px !important;
                  font-size: 15px !important;
                  width: 100% !important;
                }
                .view-tournament-card {
                  margin-top: 32px !important;
                }
                .view-tournament-card .ant-card-body {
                  padding: 24px !important;
                }
                .view-tournament-title {
                  font-size: 22px !important;
                }
                .view-tournament-input {
                  font-size: 20px !important;
                  height: 56px !important;
                }
                .view-tournament-btn {
                  height: 48px !important;
                  font-size: 15px !important;
                }
              }
            `}</style>
            <Row gutter={[64, 48]} align="middle">
              {/* Left Side - Main Content */}
              <Col xs={24} lg={13}>
                <Space direction="vertical" size={32} style={{ width: '100%', textAlign: 'center' }}>
                  <div className="animate-fade-in-up stagger-1">
                    <Title
                      level={1}
                      className="hero-title"
                      style={{
                        color: '#fff',
                        fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        margin: 0,
                        letterSpacing: '-0.02em',
                        textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                        textAlign: 'center'
                      }}
                    >
                      Designed to
                      <br />
                      Elevate Your
                      <br />
                      Tournament
                    </Title>
                  </div>
                  
                  <div className="animate-fade-in-up stagger-2">
                    <Paragraph
                      className="hero-description"
                      style={{
                        color: 'rgba(255, 255, 255, 0.85)',
                        fontSize: '1.25rem',
                        maxWidth: '600px',
                        margin: '0 auto',
                        lineHeight: 1.6,
                        textAlign: 'center'
                      }}
                    >
                      Run tournaments for any sport with ease. Manage brackets, schedules, and live games all in one place. Perfect for university intramurals, weekend tournaments, and professional events.
                    </Paragraph>
                  </div>
                  
                  <div className="animate-fade-in-up stagger-3">
                    <Link to="/login" style={{ display: 'block', width: '100%' }}>
                      <Button
                        type="primary"
                        size="large"
                        icon={<ArrowRightOutlined />}
                        className="hero-cta-btn"
                        block
                        style={{ 
                          height: '56px', 
                          paddingLeft: '32px', 
                          paddingRight: '32px',
                          fontSize: '16px',
                          fontWeight: 600,
                          background: '#f97316',
                          borderColor: '#f97316',
                          color: '#fff',
                          borderRadius: '28px',
                          boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)'
                        }}
                      >
                        Get Started Today
                      </Button>
            </Link>
                  </div>
                  
                  {/* Social Proof */}
                  <div className="animate-fade-in-up stagger-4">
                    <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '15px', fontWeight: 500 }}>
                      Trusted by organizers at universities
                      <br />
                      and sports facilities nationwide
                    </Text>
                  </div>
                </Space>
              </Col>

              {/* Right Side - View Tournament Card */}
              <Col xs={24} lg={11}>
                <div className="animate-slide-in-right stagger-3 view-tournament-card">
                  <Card
                    style={{
                      background: '#fff',
                      borderRadius: '24px',
                      border: 'none',
                      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.2)',
                    }}
                    bodyStyle={{ padding: '40px' }}
                  >
                    <Space direction="vertical" size={24} style={{ width: '100%' }}>
                      <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
                        <Title level={3} className="view-tournament-title" style={{ margin: 0, fontSize: '28px', fontWeight: 700 }}>
                          View Live Tournament
                        </Title>
                        <Text style={{ fontSize: '15px', color: '#6b7280' }}>
                          Enter a 6-character share code to watch any tournament in real-time
                        </Text>
                      </Space>
                      
                      <Form
                        form={form}
                        onFinish={handleViewTournament}
                        layout="vertical"
                      >
                        <Form.Item
                          name="shareCode"
                          rules={[
                            { required: true, message: 'Please enter a share code' },
                            { len: 6, message: 'Share code must be 6 characters' },
                          ]}
                        >
                          <Input
                            placeholder="ENTER CODE"
                            size="large"
                            className="view-tournament-input"
                            style={{
                              textAlign: 'center',
                              fontSize: '24px',
                              fontWeight: 700,
                              letterSpacing: '0.3em',
                              textTransform: 'uppercase',
                              height: '64px',
                              borderRadius: '12px',
                              border: '2px solid #e5e7eb',
                              fontFamily: 'monospace'
                            }}
                            maxLength={6}
                            onChange={(e) => {
                              const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                              form.setFieldsValue({ shareCode: value });
                            }}
                          />
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 0 }}>
                          <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            block
                            icon={<ArrowRightOutlined />}
                            className="view-tournament-btn"
                            style={{
                              height: '56px',
                              borderRadius: '28px',
                              background: '#f97316',
                              borderColor: '#f97316',
                              fontSize: '16px',
                              fontWeight: 600,
                              color: '#fff'
                            }}
                          >
                            View Tournament
                          </Button>
                        </Form.Item>
                      </Form>
                      
                      <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                        <Text style={{ fontSize: '13px', color: '#9ca3af' }}>
                          No account required • Updates in real-time
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </div>
              </Col>
            </Row>
          </div>
        </div>

        {/* Interactive Bracket Demo Section */}
        <div id="demo" style={{ padding: '100px 0', background: '#fff' }} className="demo-section">
          <style>{`
            @media (max-width: 768px) {
              .demo-section {
                padding: 60px 0 !important;
              }
              .demo-section .ant-typography {
                font-size: 1.5rem !important;
              }
              .demo-section .ant-typography + .ant-typography {
                font-size: 0.875rem !important;
              }
              .demo-card {
                padding: 0 24px !important;
              }
              .demo-card .ant-card-body {
                padding: 24px !important;
              }
            }
          `}</style>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 48px' }} className="demo-card">
            <Space direction="vertical" size={48} style={{ width: '100%' }}>
              <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                <Title level={2} style={{ margin: '0 0 16px 0', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  See It In Action
                </Title>
                <Text style={{ fontSize: '18px', color: '#6b7280', lineHeight: 1.6 }}>
                  Explore live tournament features. Watch real-time timers, manage multiple courts, and interact with the bracket to see how Bracketooski makes tournament management effortless.
                </Text>
              </div>

              <Card
                style={{
                  borderRadius: '24px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden'
                }}
                bodyStyle={{ padding: '32px' }}
              >
                <Tabs
                  defaultActiveKey="bracket"
                  items={[
                    {
                      key: 'bracket',
                      label: (
                        <span style={{ fontSize: '16px', fontWeight: 600 }}>
                          Interactive Bracket Viewer
                        </span>
                      ),
                      children: (
                        <Space direction="vertical" size={24} style={{ width: '100%' }} className="demo-content">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <Space direction="vertical" size={4}>
                              <Title level={4} className="demo-title" style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
                                YMCA Hoops
                              </Title>
                              <Text className="demo-subtitle" style={{ fontSize: '14px', color: '#6b7280' }}>
                                16 Teams • Single Elimination • Semi-Finals in Progress
                              </Text>
                            </Space>
                            <Space>
                              <Badge count="Live" style={{ background: '#22c55e', color: '#fff' }} />
                              <Badge count="Semi-Finals" style={{ background: '#f97316', color: '#fff' }} />
                            </Space>
                          </div>
                          
                          <div style={{ 
                            borderRadius: '16px', 
                            overflow: 'hidden',
                            border: '2px solid #e5e7eb',
                            background: '#fafafa'
                          }}>
                            <ReactFlowTournamentBracket tournament={demoTournament} />
                          </div>
                          
                          <div style={{ textAlign: 'center', paddingTop: '16px' }}>
                            <Text className="demo-tip" style={{ fontSize: '14px', color: '#9ca3af' }}>
                              💡 <strong>Try it:</strong> Drag to pan • Scroll to zoom • Use controls in bottom-left
                            </Text>
                          </div>
                        </Space>
                      ),
                    },
                    {
                      key: 'courts',
                      label: (
                        <span style={{ fontSize: '16px', fontWeight: 600 }}>
                          Live Courts Management
                        </span>
                      ),
                      children: <CourtsManagementDemo />,
                    },
                    {
                      key: 'editor',
                      label: (
                        <span style={{ fontSize: '16px', fontWeight: 600 }} className="tab-editor-mobile">
                          Bracket Editor
                        </span>
                      ),
                      children: <BracketEditorDemo />,
                    },
                  ]}
                  style={{
                    fontFamily: 'Poppins, sans-serif',
                  }}
                />
                <style>{`
                  @media (max-width: 768px) {
                    .tab-editor-mobile {
                      display: none !important;
                    }
                    .demo-title {
                      font-size: 1.25rem !important;
                    }
                    .demo-subtitle {
                      font-size: 0.875rem !important;
                    }
                    .demo-tip {
                      font-size: 0.75rem !important;
                    }
                  }
                `}</style>
              </Card>
            </Space>
          </div>
        </div>
        
        {/* Features Section */}
        <div id="features" style={{ padding: '100px 0', background: '#f9fafb' }} className="features-section">
          <style>{`
            @media (max-width: 768px) {
              .features-section {
                padding: 60px 0 !important;
              }
              .features-section .ant-typography {
                font-size: 1.5rem !important;
              }
              .features-section .ant-typography + .ant-typography {
                font-size: 0.875rem !important;
              }
              .features-container {
                padding: 0 24px !important;
              }
              .feature-card .ant-card-body {
                padding: 24px !important;
              }
              .feature-card h4.ant-typography {
                font-size: 1rem !important;
              }
              .feature-card .ant-typography + .ant-typography {
                font-size: 0.875rem !important;
              }
              .feature-card {
                text-align: center !important;
              }
            }
          `}</style>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 48px' }} className="features-container">
            <Space direction="vertical" size={48} style={{ width: '100%' }}>
              <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
                <Title level={2} style={{ margin: '0 0 16px 0', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Everything You Need to Run Professional Tournaments
                </Title>
                <Text style={{ fontSize: '18px', color: '#6b7280' }}>
                  From bracket generation to live timers, Bracketooski eliminates the chaos and keeps your tournament running smoothly
                </Text>
              </div>

              <Row gutter={[32, 32]}>
                <Col xs={24} md={8}>
                  <Card
                    className="feature-card feature-card-mobile"
                    style={{
                      borderRadius: '20px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      height: '100%'
                    }}
                    bodyStyle={{ padding: '40px' }}
                  >
                    <Space direction="vertical" size={20} style={{ width: '100%', textAlign: 'center' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          background: '#f97316',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        <TrophyOutlined style={{ fontSize: '28px', color: '#fff' }} />
                      </div>
                      <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
                        <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>
                          Smart Bracket Management
                        </Title>
                        <Text style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.6, textAlign: 'center', display: 'block' }}>
                          Single & double elimination with automatic seeding, team advancement, and BYE handling. Visual brackets update in real-time.
                        </Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card
                    className="feature-card"
                    style={{
                      borderRadius: '20px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      height: '100%'
                    }}
                    bodyStyle={{ padding: '40px' }}
                  >
                    <Space direction="vertical" size={20} style={{ width: '100%', textAlign: 'center' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          background: '#f97316',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        <ClockCircleOutlined style={{ fontSize: '28px', color: '#fff' }} />
                      </div>
                      <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
                        <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>
                          Live Game Timers
                        </Title>
                        <Text style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.6, textAlign: 'center', display: 'block' }}>
                          Track warmup, game, and overtime periods with synced countdown timers. Pause, resume, and manage time across all courts.
                        </Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card
                    className="feature-card"
                    style={{
                      borderRadius: '20px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      height: '100%'
                    }}
                    bodyStyle={{ padding: '40px' }}
                  >
                    <Space direction="vertical" size={20} style={{ width: '100%', textAlign: 'center' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          background: '#f97316',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        <UserOutlined style={{ fontSize: '28px', color: '#fff' }} />
                      </div>
                      <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
                        <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>
                          Multi-Court Management
                        </Title>
                        <Text style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.6, textAlign: 'center', display: 'block' }}>
                          Manage unlimited courts with auto-assignment of games. Assign referees and track court status in real-time.
                        </Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card
                    className="feature-card"
                    style={{
                      borderRadius: '20px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      height: '100%'
                    }}
                    bodyStyle={{ padding: '40px' }}
                  >
                    <Space direction="vertical" size={20} style={{ width: '100%', textAlign: 'center' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          background: '#f97316',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        <TeamOutlined style={{ fontSize: '28px', color: '#fff' }} />
                      </div>
                      <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
                        <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>
                          Easy Team Import
                        </Title>
                        <Text style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.6, textAlign: 'center', display: 'block' }}>
                          Bulk upload teams via CSV/Excel or add them manually. Support for custom seeding and team tracking throughout the tournament.
                        </Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card
                    className="feature-card"
                    style={{
                      borderRadius: '20px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      height: '100%'
                    }}
                    bodyStyle={{ padding: '40px' }}
                  >
                    <Space direction="vertical" size={20} style={{ width: '100%', textAlign: 'center' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          background: '#f97316',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        <ShareAltOutlined style={{ fontSize: '28px', color: '#fff' }} />
                      </div>
                      <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
                        <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>
                          Real-Time Sharing
                        </Title>
                        <Text style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.6, textAlign: 'center', display: 'block' }}>
                          Generate share codes so fans, players, and coaches can watch tournament progress live. No account required for viewers.
                        </Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card
                    className="feature-card"
                    style={{
                      borderRadius: '20px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      height: '100%'
                    }}
                    bodyStyle={{ padding: '40px' }}
                  >
                    <Space direction="vertical" size={20} style={{ width: '100%', textAlign: 'center' }}>
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          background: '#f97316',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto',
                        }}
                      >
                        <ThunderboltOutlined style={{ fontSize: '28px', color: '#fff' }} />
                      </div>
                      <Space direction="vertical" size={8} style={{ width: '100%', textAlign: 'center' }}>
                        <Title level={4} style={{ margin: 0, fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>
                          Multi-Sport Support
                        </Title>
                        <Text style={{ color: '#6b7280', fontSize: '15px', lineHeight: 1.6, textAlign: 'center', display: 'block' }}>
                          Configurable settings for any sport. Customize game length, warmup time, and venue terminology (court, field, etc.).
                        </Text>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </Space>
          </div>
        </div>

        {/* Use Cases Section */}
        <div id="why-us" style={{ padding: '100px 0', background: '#fff' }} className="use-cases-section">
          <style>{`
            @media (max-width: 768px) {
              .use-cases-section {
                padding: 60px 0 !important;
              }
              .use-cases-title {
                font-size: 1.5rem !important;
              }
              .use-cases-description {
                font-size: 0.875rem !important;
              }
              .use-cases-container {
                padding: 0 24px !important;
              }
              .use-cases-card {
                padding: 32px 24px !important;
                margin-top: 32px !important;
              }
              .use-cases-card .ant-typography {
                font-size: 24px !important;
              }
            }
          `}</style>
          <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 48px' }} className="use-cases-container">
            <Row gutter={[64, 48]} align="middle">
              <Col xs={24} lg={12}>
                <Space direction="vertical" size={24} style={{ width: '100%', textAlign: 'center' }}>
                  <div>
                    <Title level={2} className="use-cases-title" style={{ margin: '0 0 0 0', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center' }}>
                      Built for Fast-Paced Tournament Environments
                    </Title>
                  </div>
                  <Text className="use-cases-description" style={{ fontSize: '17px', color: '#6b7280', lineHeight: 1.7, textAlign: 'center', maxWidth: '600px', margin: '0 auto', display: 'block' }}>
                    Whether you're running weekend intramurals at your university, organizing a one-day club sports tournament, or managing a professional multi-day championship, Bracketooski keeps everything on schedule.
                  </Text>
                  <Space direction="vertical" size={16} style={{ width: '100%', paddingTop: '16px' }}>
                    {[
                      { title: 'University Intramurals', desc: 'Perfect for one-day and weekend tournaments with 16-32 teams across multiple courts' },
                      { title: 'Club Sports Championships', desc: 'Organize end-of-season tournaments for soccer, volleyball, basketball, and more' },
                      { title: 'Professional Events', desc: 'Manage regional championships and multi-day tournaments with hundreds of teams' },
                    ].map((item, index) => (
                      <div key={index} style={{ paddingLeft: '20px', borderLeft: '3px solid #f97316' }}>
                        <Title level={5} style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>
                          {item.title}
                        </Title>
                        <Text style={{ color: '#6b7280', fontSize: '15px' }}>{item.desc}</Text>
                      </div>
                    ))}
                  </Space>
                </Space>
              </Col>
              <Col xs={24} lg={12}>
                <div className="use-cases-card" style={{ 
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                  borderRadius: '24px',
                  padding: '48px',
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    opacity: 0.1,
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                  }}/>
                  <Space direction="vertical" size={32} style={{ position: 'relative', zIndex: 1 }}>
                    <Title level={3} style={{ color: 'white', margin: 0, fontSize: '32px' }}>
                      Why Bracketooski?
                    </Title>
                    <Space direction="vertical" size={20}>
                      {[
                        'Automatic bracket generation saves hours of setup time',
                        'Multi-court management keeps tournaments on schedule',
                        'Live timers eliminate confusion about game status',
                        'Share codes let everyone follow along in real-time',
                        'Works on any device - desktop, tablet, or mobile',
                        'No training required - intuitive interface anyone can use'
                      ].map((benefit, index) => (
                        <Space key={index} align="start" size={12}>
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: 'rgba(255, 255, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <div style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              background: 'white'
                            }}/>
                          </div>
                          <Text style={{ color: 'white', fontSize: '16px', lineHeight: 1.5 }}>{benefit}</Text>
                        </Space>
                      ))}
                    </Space>
                  </Space>
                </div>
              </Col>
            </Row>
          </div>
        </div>

        {/* CTA Section */}
        <div
          className="cta-section"
          style={{
            padding: '100px 0',
            background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <style>{`
            @media (max-width: 768px) {
              .cta-section {
                padding: 60px 0 !important;
              }
              .cta-section .ant-typography {
                font-size: 1.75rem !important;
              }
              .cta-section .ant-typography + .ant-typography {
                font-size: 16px !important;
              }
              .cta-container {
                padding: 0 24px !important;
              }
              .cta-button {
                height: 48px !important;
                padding: 0 24px !important;
                font-size: 15px !important;
                width: 100% !important;
              }
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
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23f97316\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            }}
          />
          
          {/* Gradient Orb */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '800px',
              height: '800px',
              background: 'radial-gradient(circle, rgba(249, 115, 22, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              filter: 'blur(100px)',
            }}
          />
          
          <div style={{ position: 'relative', maxWidth: '800px', margin: '0 auto', padding: '0 48px', textAlign: 'center' }} className="cta-container">
            <Space direction="vertical" size={32} style={{ width: '100%' }}>
              <Title level={2} style={{ color: '#fff', margin: 0, fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Ready to Elevate Your Tournament?
              </Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '20px', maxWidth: '600px', display: 'block', margin: '0 auto' }}>
                Join tournament organizers who trust Bracketooski to keep their events running smoothly
              </Text>
              <Link to="/login" style={{ display: 'block', width: '100%' }}>
                <Button
                  size="large"
                  block
                  className="cta-button"
                  style={{
                    background: '#f97316',
                    borderColor: '#f97316',
                    color: '#fff',
                    height: '56px',
                    paddingLeft: '32px',
                    paddingRight: '32px',
                    fontSize: '16px',
                    fontWeight: 600,
                    borderRadius: '28px',
                    boxShadow: '0 10px 30px rgba(249, 115, 22, 0.3)'
                  }}
                  icon={<ArrowRightOutlined />}
                >
                  Get Started Today
                </Button>
              </Link>
            </Space>
          </div>
        </div>
      </Content>

      {/* Footer */}
      <Footer className="landing-footer" style={{ background: '#0f172a', color: '#94a3b8', padding: '64px 48px' }}>
        <style>{`
          @media (max-width: 768px) {
            .landing-footer {
              padding: 40px 24px !important;
            }
            .footer-container {
              padding: 0 !important;
            }
            .footer-logo-section {
              text-align: center !important;
            }
            .footer-logo-section .ant-space {
              justify-content: center !important;
            }
            .footer-links-container {
              justify-content: center !important;
            }
            .footer-copyright {
              text-align: center !important;
            }
          }
        `}</style>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="footer-container">
          <Row gutter={[48, 32]}>
            <Col xs={24} md={8}>
              <Space direction="vertical" size={16} className="footer-logo-section">
                <Space align="center" size={12}>
                  <img 
                    src="/favicon.png" 
                    alt="Bracketooski Logo" 
                    style={{ width: '32px', height: '32px' }}
                  />
                  <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
                    Bracketooski
                  </Title>
                </Space>
                <Text style={{ color: '#9ca3af', fontSize: '15px', textAlign: 'center', display: 'block' }}>
                  Professional tournament management for all skill levels. Built for speed, designed for simplicity.
                </Text>
              </Space>
            </Col>
            <Col xs={24} md={16}>
              <div className="footer-links-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
                <Space direction="vertical" size={12}>
                  <Text strong style={{ color: '#fff', fontSize: '15px' }}>Product</Text>
                  <Space direction="vertical" size={8}>
                    <Text style={{ color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>Features</Text>
                    <Text style={{ color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>Pricing</Text>
                    <Text style={{ color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>Use Cases</Text>
                  </Space>
                </Space>
                <Space direction="vertical" size={12}>
                  <Text strong style={{ color: '#fff', fontSize: '15px' }}>Company</Text>
                  <Space direction="vertical" size={8}>
                    <Text 
                      style={{ color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}
                      onClick={() => {
                        const element = document.getElementById('demo');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      Demo
                    </Text>
                    <Text 
                      style={{ color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}
                      onClick={() => {
                        const element = document.getElementById('features');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      Features
                    </Text>
                    <Text 
                      style={{ color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}
                      onClick={() => {
                        const element = document.getElementById('why-us');
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                    >
                      Why Us
                    </Text>
                  </Space>
                </Space>
                <Space direction="vertical" size={12}>
                  <Text strong style={{ color: '#fff', fontSize: '15px' }}>Legal</Text>
                  <Space direction="vertical" size={8}>
                    <Text style={{ color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>Privacy Policy</Text>
                    <Text style={{ color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>Terms of Service</Text>
                    <Text style={{ color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>Cookie Policy</Text>
                  </Space>
                </Space>
              </div>
            </Col>
          </Row>
          <div className="footer-copyright" style={{ borderTop: '1px solid #374151', marginTop: '48px', paddingTop: '24px' }}>
            <Text style={{ color: '#6b7280', fontSize: '14px' }}>
              © {new Date().getFullYear()} Bracketooski. All rights reserved.
            </Text>
      </div>
    </div>
      </Footer>
    </Layout>
  );
}