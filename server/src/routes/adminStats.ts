import { Router, Request, Response } from 'express';
import { storage } from '../../storage';
import { adminStatsFilterSchema } from '../../../shared/schema';
import { AuditLogger, AuditStatus } from '../models/AuditLog';

// Create router
const router = Router();

// Initialize audit logger
const auditLogger = new AuditLogger(storage);

/**
 * Admin middleware - checks if user has admin privileges
 * In production, implement proper role-based access control
 */
interface AuthRequest extends Request {
  user: {
    id: number;
    email: string;
    isAdmin?: boolean;
  };
}

const adminMiddleware = async (req: Request, res: Response, next: Function) => {
  try {
    const authReq = req as AuthRequest;
    
    // Check if user is authenticated
    if (!authReq.user || !authReq.user.id) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please log in to access admin features.'
      });
    }

    // Simple admin check - in production, implement proper RBAC
    // For now, check if user email contains 'admin' or is in admin list
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
    const isAdmin = authReq.user.email.includes('admin') || 
                   adminEmails.includes(authReq.user.email) ||
                   authReq.user.isAdmin === true;

    if (!isAdmin) {
      // Log unauthorized admin access attempt
      await auditLogger.log(
        'admin_access_denied',
        AuditStatus.FAILURE,
        {
          userId: authReq.user.id,
          ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                    req.connection.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          details: { 
            email: auditLogger.maskEmail(authReq.user.email),
            attemptedRoute: req.path 
          }
        }
      );

      return res.status(403).json({
        error: 'Access denied',
        message: 'Administrative privileges required.'
      });
    }

    // Log successful admin access
    await auditLogger.log(
      'admin_access_granted',
      AuditStatus.SUCCESS,
      {
        userId: authReq.user.id,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                  req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        details: { 
          email: auditLogger.maskEmail(authReq.user.email),
          route: req.path 
        }
      }
    );

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error checking admin privileges.'
    });
  }
};

/**
 * @route   GET /admin/stats/otp
 * @desc    Get OTP statistics for admin dashboard
 * @access  Admin only
 * @query   hours (optional) - Time window in hours (default: 24)
 */
router.get('/otp', adminMiddleware, async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validation = adminStatsFilterSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'Please provide valid query parameters.',
        details: validation.error.errors.map(e => e.message)
      });
    }

    const { hours } = validation.data;

    // Get OTP statistics from storage
    const stats = await storage.getOtpStats(hours);

    // Calculate additional metrics
    const successRate = stats.total_requests > 0 
      ? ((stats.total_requests - stats.failed_attempts) / stats.total_requests * 100).toFixed(2)
      : 0;

    const lockoutRate = stats.total_requests > 0
      ? (stats.lockouts_triggered / stats.total_requests * 100).toFixed(2)
      : 0;

    res.json({
      timeWindow: {
        hours,
        start: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      requests: {
        total: parseInt(stats.total_requests) || 0,
        failed: parseInt(stats.failed_attempts) || 0,
        successRate: `${successRate}%`
      },
      security: {
        lockoutsTriggered: parseInt(stats.lockouts_triggered) || 0,
        lockoutRate: `${lockoutRate}%`
      },
      channels: {
        email: parseInt(stats.email_sends) || 0,
        sms: parseInt(stats.sms_sends) || 0
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        requestedBy: (req as AuthRequest).user.email
      }
    });

  } catch (error) {
    console.error('Error getting OTP stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve OTP statistics.'
    });
  }
});

/**
 * @route   GET /admin/stats/2fa
 * @desc    Get 2FA adoption and usage statistics
 * @access  Admin only
 */
router.get('/2fa', adminMiddleware, async (req: Request, res: Response) => {
  try {
    // Get 2FA statistics from storage
    const stats = await storage.get2FAStats();

    // Calculate adoption metrics
    const totalUsers = parseInt(stats.total_users) || 0;
    const usersWith2FA = parseInt(stats.users_with_2fa) || 0;
    const adoptionRate = totalUsers > 0 
      ? (usersWith2FA / totalUsers * 100).toFixed(2)
      : 0;

    const emailUsers = parseInt(stats.email_2fa_users) || 0;
    const smsUsers = parseInt(stats.sms_2fa_users) || 0;

    res.json({
      adoption: {
        totalUsers,
        usersWith2FA,
        adoptionRate: `${adoptionRate}%`,
        usersWithout2FA: totalUsers - usersWith2FA
      },
      channels: {
        email: {
          count: emailUsers,
          percentage: usersWith2FA > 0 ? `${(emailUsers / usersWith2FA * 100).toFixed(1)}%` : '0%'
        },
        sms: {
          count: smsUsers,
          percentage: usersWith2FA > 0 ? `${(smsUsers / usersWith2FA * 100).toFixed(1)}%` : '0%'
        }
      },
      trends: {
        // Future: Add time-based adoption trends
        message: 'Trend data available in future versions'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        requestedBy: (req as AuthRequest).user.email
      }
    });

  } catch (error) {
    console.error('Error getting 2FA stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve 2FA statistics.'
    });
  }
});

/**
 * @route   GET /admin/stats/security
 * @desc    Get security-related statistics and alerts
 * @access  Admin only
 */
router.get('/security', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;

    // Get security statistics
    const [otpStats, twoFAStats] = await Promise.all([
      storage.getOtpStats(hours),
      storage.get2FAStats()
    ]);

    // Get recent security events from audit logs
    const securityEvents = await auditLogger.getSecurityAlerts(hours);

    // Calculate security score (simple implementation)
    const totalAttempts = parseInt(otpStats.total_requests) || 0;
    const failedAttempts = parseInt(otpStats.failed_attempts) || 0;
    const lockouts = parseInt(otpStats.lockouts_triggered) || 0;
    
    let securityScore = 100;
    if (totalAttempts > 0) {
      const failureRate = failedAttempts / totalAttempts;
      const lockoutRate = lockouts / totalAttempts;
      
      securityScore = Math.max(0, 100 - (failureRate * 30) - (lockoutRate * 50));
    }

    res.json({
      timeWindow: {
        hours,
        start: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      securityScore: {
        score: Math.round(securityScore),
        level: securityScore >= 90 ? 'Excellent' : 
               securityScore >= 70 ? 'Good' : 
               securityScore >= 50 ? 'Fair' : 'Poor',
        factors: {
          failureRate: totalAttempts > 0 ? `${(failedAttempts / totalAttempts * 100).toFixed(1)}%` : '0%',
          lockoutRate: totalAttempts > 0 ? `${(lockouts / totalAttempts * 100).toFixed(1)}%` : '0%'
        }
      },
      alerts: {
        high: securityEvents.filter(e => e.severity === 'high').length,
        medium: securityEvents.filter(e => e.severity === 'medium').length,
        low: securityEvents.filter(e => e.severity === 'low').length,
        recent: securityEvents.slice(0, 5) // Most recent 5 alerts
      },
      threats: {
        bruteForceAttempts: failedAttempts,
        accountLockouts: lockouts,
        suspiciousIPs: securityEvents.filter(e => e.action === 'suspicious_activity').length
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        requestedBy: (req as AuthRequest).user.email
      }
    });

  } catch (error) {
    console.error('Error getting security stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve security statistics.'
    });
  }
});

/**
 * @route   GET /admin/stats/overview
 * @desc    Get comprehensive dashboard overview
 * @access  Admin only
 */
router.get('/overview', adminMiddleware, async (req: Request, res: Response) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;

    // Get all statistics in parallel
    const [otpStats, twoFAStats, securityEvents] = await Promise.all([
      storage.getOtpStats(hours),
      storage.get2FAStats(),
      auditLogger.getSecurityAlerts(hours)
    ]);

    res.json({
      timeWindow: {
        hours,
        start: new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      authentication: {
        otp: {
          totalRequests: parseInt(otpStats.total_requests) || 0,
          failedAttempts: parseInt(otpStats.failed_attempts) || 0,
          lockouts: parseInt(otpStats.lockouts_triggered) || 0
        },
        twoFactor: {
          totalUsers: parseInt(twoFAStats.total_users) || 0,
          enabledUsers: parseInt(twoFAStats.users_with_2fa) || 0,
          adoptionRate: `${(parseInt(twoFAStats.users_with_2fa) / parseInt(twoFAStats.total_users) * 100 || 0).toFixed(1)}%`
        }
      },
      security: {
        alertsCount: securityEvents.length,
        highPriorityAlerts: securityEvents.filter((e: any) => e.severity === 'high').length,
        status: securityEvents.filter((e: any) => e.severity === 'high').length > 0 ? 'Warning' : 'Good'
      },
      system: {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error getting overview stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve overview statistics.'
    });
  }
});

export default router;
