import { cx, vars } from '@/lib/css';
import styles from './Visuals.module.css';

/** A wireframe that builds into a designed page when active: structure first, then design. */
export function SiteMock({ active }: { active: boolean }) {
  const blk = (cls: string, d: number) => <i className={cx(styles.blk, cls)} style={vars({ d })} />;
  return (
    <div className={styles.site} data-active={active ? '' : undefined}>
      <div className={styles.siteNav}>
        {blk(styles.bLogo, 0)}
        {blk(styles.bLink, 1)}
        {blk(styles.bLink, 1)}
        {blk(styles.bLink, 2)}
        {blk(styles.bBtn, 2)}
      </div>
      <div className={cx(styles.blk, styles.siteHero)} style={vars({ d: 3 })}>
        {blk(styles.bL1, 4)}
        {blk(styles.bL2, 5)}
        {blk(styles.bCta, 6)}
      </div>
      <div className={styles.siteCards}>
        {blk(styles.bCard, 7)}
        {blk(styles.bCard, 8)}
        {blk(styles.bCard, 9)}
      </div>
    </div>
  );
}
