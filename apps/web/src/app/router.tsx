import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout, ProtectedLayout, RootLayout } from './layout';
import { LandingPage } from '@/pages/landing';
import {
  LoginPage,
  OAuthCallbackPage,
  ProfilePage,
  VerificationStartPage,
  VerifyCodePage,
} from '@/pages/auth';
import {
  CreatedEmailPage,
  EmailDetailPage,
  EmailsPage,
  NewEmailPage,
} from '@/pages/emails';
import { DestinationsPage, NewDestinationPage } from '@/pages/destinations';
import { RulePage } from '@/pages/rule';
import { DeliveriesPage, SettingsPage } from '@/pages/account';
import { RecoveryPage } from '@/pages/recovery';
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RecoveryPage />,
    children: [
      { path: '/', element: <LandingPage /> },
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          {
            path: '/signup',
            element: <VerificationStartPage kind="register" />,
          },
          {
            path: '/signup/verify',
            element: <VerifyCodePage kind="register" />,
          },
          { path: '/signup/profile', element: <ProfilePage mode="register" /> },
          { path: '/signup/social', element: <ProfilePage mode="social" /> },
          {
            path: '/password/reset',
            element: <VerificationStartPage kind="password" />,
          },
          {
            path: '/password/reset/verify',
            element: <VerifyCodePage kind="password" />,
          },
          {
            path: '/password/reset/new',
            element: <ProfilePage mode="reset" />,
          },
          { path: '/oauth/:provider/callback', element: <OAuthCallbackPage /> },
          // OAuth 제공자에 등록된 개발용 콜백 URL도 같은 처리 화면을 사용합니다.
          { path: '/callback/oauth/:provider', element: <OAuthCallbackPage /> },
        ],
      },
      {
        element: <ProtectedLayout />,
        children: [
          { path: '/emails', element: <EmailsPage /> },
          { path: '/emails/new', element: <NewEmailPage /> },
          { path: '/emails/created', element: <CreatedEmailPage /> },
          { path: '/email/:id', element: <EmailDetailPage /> },
          { path: '/email/:id/rule/:ruleId', element: <RulePage /> },
          { path: '/destinations', element: <DestinationsPage /> },
          { path: '/destinations/new', element: <NewDestinationPage /> },
          { path: '/deliveries', element: <DeliveriesPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
      { path: '*', element: <RecoveryPage /> },
    ],
  },
]);
