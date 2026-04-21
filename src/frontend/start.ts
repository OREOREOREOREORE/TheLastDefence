import { Application } from "../engine/application";

import backgroundImage from '../../asset/background.png'

document.addEventListener('DOMContentLoaded', () => {
    const app = new Application({
       rootElementSelector: '#app',
       width: 1600, // 1200, 800
       height: 900,
       background: `url(${backgroundImage}) no-repeat center`,
    })

    app.initialize();
})
