import React from 'react';
import {
  Page,
  Bar,
  Title,
  Button,
  Avatar,
  AvatarSize,
  FlexBox,
  FlexBoxDirection,
  FlexBoxJustifyContent,
  FlexBoxAlignItems
} from '@ui5/webcomponents-react';
import ReportsManager from '../components/reports/ReportsManager';

const ReportsPage: React.FC = () => {
  return (
    <Page
      style={{
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}
      header={
        <Bar design="Header">
          <FlexBox 
            direction={FlexBoxDirection.Row} 
            justifyContent={FlexBoxJustifyContent.Start}
            alignItems={FlexBoxAlignItems.Center}
            style={{ gap: '1rem' }}
          >
            <Avatar 
              size={AvatarSize.S}
              style={{ backgroundColor: '#4472C4', color: 'white' }}
            >
              📊
            </Avatar>
            <Title level="H2">Управление отчетами</Title>
          </FlexBox>
          
          <FlexBox 
            direction={FlexBoxDirection.Row} 
            style={{ gap: '0.5rem' }}
          >
            <Button 
              design="Transparent"
              onClick={() => window.open('/help/reports', '_blank')}
            >
              📖 Справка
            </Button>
            
            <Button 
              design="Transparent"
              onClick={() => {
                // Переход к настройкам email
                const event = new CustomEvent('navigate', { 
                  detail: { path: '/settings/email' } 
                });
                window.dispatchEvent(event);
              }}
            >
              ⚙️ Настройки
            </Button>
          </FlexBox>
        </Bar>
      }
    >
      <ReportsManager />
    </Page>
  );
};

export default ReportsPage; 

