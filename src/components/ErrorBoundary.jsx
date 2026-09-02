import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: 40, gap: 16, textAlign: 'center'
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            حدث خطأ غير متوقع
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 400 }}>
            {this.state.error?.message || 'خطأ في تحميل هذه الصفحة. يرجى المحاولة مرة أخرى.'}
          </p>
          <button
            className="btn-primary"
            style={{ padding: '9px 22px', fontSize: 13 }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            🔄 إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
