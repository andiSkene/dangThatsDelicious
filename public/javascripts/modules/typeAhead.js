import axios from 'axios';
//sanitize data to prevent getting hacked
import dompurify from 'dompurify';

function searchResultsHTML(stores) {
  return stores.map(store => {
    return `
    <a href="/store/${store.slug}" class="search__result">
    <strong>${store.name}</strong>
    </a>`
  }).join('');
};

function typeAhead(search) {
  if(!search) return;

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.on('input', function() {
    //if there's no value, quit
    if(!this.value){
      searchResults.style.display = 'none';
      return;
    }

    //show search results
    searchResults.style.display = 'block';

    axios
      .get(`/api/search?q=${this.value}`)
      .then(res => {
        if(res.data.length){
          searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
          return;
        } else {
          //tell them nothing came back
          searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for ${this.value} found!</div>`);
        }
      })
      .catch(err => {
        console.error(err);
      });
  });

  //handle keyboard inputs
  searchInput.on('keyup', (e) => {
    //if they aren't pressing up, down, or enter, who cares??
    if(![38, 40, 13].includes(e.keyCode)) {
      return; //skip it
    };
    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll('.search__result');
    let next;
    //if they press down and one is selected, go to next one
    if (e.keyCode === 40 && current) {
      next = current.nextElementSibling || items[0];
    //if they press down and none is selected, go to first one
    } else if(e.keyCode === 40){
      next = items[0];
    //if they press up and one is selected, go to previous one
    } else if(e.keyCode === 38 && current){
      next = current.previousElementSibling || items[items.length - 1];
    //if they press up and none is selected, go to last one
    } else if(e.keyCode === 38){
      next = items[items.length - 1];
    //if they press enter and one is selected, go to current page
    } else if(e.keyCode === 13 && current.href){
      window.location = current.href;
      return;
    };

    if(current){
      current.classList.remove(activeClass);
    };
    next.classList.add(activeClass);
  })
};

export default typeAhead;
