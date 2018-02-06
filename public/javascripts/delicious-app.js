import '../sass/style.scss';

import { $, $$ } from './modules/bling';
import autocomplete from './modules/autocomplete.js';
import typeAhead from './modules/typeAhead.js';
import makeMap from './modules/map.js';
import ajaxHeart from './modules/heart.js';

autocomplete($('#address'), $('#lat'), $('#lng'));

typeAhead( $('.search') );

makeMap( $('#map') );

//add a listener to every form labeled 'heart' and if any are clicked run ajaxHeart
const heartForms = $$('form.heart');
heartForms.on('submit', ajaxHeart);
