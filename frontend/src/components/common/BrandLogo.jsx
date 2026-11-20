import logo from '../../assets/images/Logo.webp';
import darkLogo from '../../assets/images/LogoHorizontalDarkmode.webp';
import lightLogo from '../../assets/images/LogoHorizontalLightmode.webp';

export default function BrandLogo() {
  return (
    <span className="brand-logo">
      <img className="brand-horizontal brand-dark" src={darkLogo} alt="Coffee Zone" />
      <img className="brand-horizontal brand-light" src={lightLogo} alt="Coffee Zone" />
      <img className="brand-compact" src={logo} alt="Coffee Zone" />
    </span>
  );
}
