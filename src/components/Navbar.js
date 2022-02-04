import React from "react";
import { Link } from "gatsby";
import styled from "styled-components";
import logo from "../img/logo.png";

const NavbarStyled = styled.nav`
  border: red solid 1px;
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  padding-left: 10%;
  padding-right: 10%;
  > div {
    border: blue solid 1px;
    justify-content: center;
  }
`;

const NavBarLogo = styled(Link)`
  min-height: 60px;
`;
const NavBarMenuItems = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  min-height: 60px;
  > div {
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;
    border: green solid 1px;
    padding: 15px;
  }
`;
const NavBarLink = styled(Link)`
  min-width: 100px;
  text-align: center;
  font-family: sans-serif;
  font-weight: bold;
  color: #333333;
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
            <div>
              <NavBarLink to="/about">About</NavBarLink>
            </div>
            <div>
              <NavBarLink to="/projects">Projects</NavBarLink>
            </div>
            <div>
              <NavBarLink to="/articles">Articles</NavBarLink>
            </div>
            <div>
              <NavBarLink to="/contact">Contact</NavBarLink>
            </div>
          </NavBarMenuItems>
        </div>
      </NavbarStyled>
    );
  }
};

export default Navbar;
