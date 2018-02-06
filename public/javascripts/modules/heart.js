import axios from 'axios';
import { $ } from './bling';

function ajaxHeart(e) {
  e.preventDefault();
  axios
    //post this form (this = form getting submitted)
    .post(this.action)
    .then(res => {
      //in this case 'this' is the form element from the storecard
      const isHearted = this.heart.classList.toggle('heart__button--hearted');
      $('.heart-count').textContent = res.data.hearts.length;
      if(isHearted) {
        //make the floating heart animation
        this.heart.classList.add('heart__button--float');
        //after animation remove the class so it doesn't get in the way of the nav buttons
        setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500);
      }
    })
    .catch(console.error);
};

export default ajaxHeart;
