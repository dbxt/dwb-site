import React from "react";
import { Link } from "gatsby";
import styled from "styled-components";
import github from "../img/github-icon.svg";
import logo from "../img/logo.png";

const NavbarStyled = styled.nav`
  display: flex;
  flex-direction: row;
  padding-left: 10%;
  padding-right: 10%;
`;

const NavBarLogo = styled(Link)`
  min-height: 60px;
`;
const NavBarLink = styled(Link)`
  min-width: 100px;
  text-align: center;
  font-family: sans-serif;
  font-weight: bold;
  color: #333333;
`;
const NavBarAnchor = styled.a`
  min-width: 100px;
  text-align: center;
  font-family: sans-serif;
  font-weight: bold;
  color: #333333;
`;
const NavBarMenuItems = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  min-height: 60px;
`;

const Navbar = class extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      active: false,
      navBarActiveClass: "",
    };
  }

  toggleHamburger() {
    // toggle the active boolean in the state
    this.setState(
      {
        active: !this.state.active,
      },
      // after state has been updated,
      () => {
        // set the class in state for the navbar accordingly
        this.state.active
          ? this.setState({
              navBarActiveClass: "is-active",
            })
          : this.setState({
              navBarActiveClass: "",
            });
      }
    );
  }

  render() {
    return (
      <NavbarStyled role="navigation" aria-label="main-navigation">
        <div className="navbar-brand">
          <NavBarLogo to="/" title="Logo">
            <img src={logo} alt="David Wayne Baxter Logo" />
          </NavBarLogo>
          {/* Hamburger menu */}
          <div
            className={`navbar-burger burger ${this.state.navBarActiveClass}`}
            data-target="navMenu"
            role="menuitem"
            tabIndex={0}
            onKeyPress={() => this.toggleHamburger()}
            onClick={() => this.toggleHamburger()}
          >
            <span />
            <span />
            <span />
          </div>
        </div>
        <div
          id="navMenu"
          className={`navbar-menu ${this.state.navBarActiveClass}`}
        >
          <NavBarMenuItems>
            <NavBarLink to="/about">About</NavBarLink>
            <NavBarLink to="/projects">Projects</NavBarLink>
            <NavBarLink to="/articles">Articles</NavBarLink>
            <NavBarLink to="/contact">Contact</NavBarLink>
          </NavBarMenuItems>
          <div className="navbar-end has-text-centered">
            <NavBarAnchor
              href="https://github.com/netlify-templates/gatsby-starter-netlify-cms"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="icon">
                <img src={github} alt="Github" />
              </span>
            </NavBarAnchor>
          </div>
        </div>
      </NavbarStyled>
    );
  }
};

export default Navbar;
