interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/** Заголовок страницы с подзаголовком и действиями справа. */
export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__row">
        <div>
          <h1>{title}</h1>
          {subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
        </div>
        {children ? <div className="btn-row">{children}</div> : null}
      </div>
    </header>
  );
}
