import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/clients/:path*",
    "/pipeline/:path*",
    "/tasks/:path*",
    "/calendar/:path*",
    "/policies/:path*",
    "/commissions/:path*",
    "/chargebacks/:path*",
    "/communications/:path*",
    "/automations/:path*",
    "/reports/:path*",
    "/team/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/leads/:path*",
    "/api/clients/:path*",
    "/api/pipeline/:path*",
    "/api/tasks/:path*",
    "/api/appointments/:path*",
    "/api/policies/:path*",
    "/api/commissions/:path*",
    "/api/chargebacks/:path*",
    "/api/dashboard/:path*",
    "/api/reports/:path*",
    "/api/audit/:path*",
  ],
};
