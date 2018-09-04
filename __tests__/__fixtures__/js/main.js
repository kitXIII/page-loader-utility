$(document).ready(function() {
  $('#contactModal form').on('submit', function(e) {
        
    var $form = $(e.currentTarget),
        $email = $form.find('#contactInputEmail'),
        $name = $form.find('#contactInputName'),
        $text = $form.find('#contactInputText'),
        $button = $form.find('button[type=submit]'),
        nameRegExp = /^[a-zа-яё]+$/i, // только буквы независимо от регистра
        emailRegExp = /^([a-z0-9_-]+\.)*[a-z0-9_-]+@[a-z0-9_-]+(\.[a-z0-9_-]+)*\.[a-z]{2,6}$/i, //проверка email
        textRegExp = /^[-а-яёa-z0-9 \n.,!?\(\)]+$/i, // указаны символы допустимые в форме, а также перенос строки \n   
        check = true;          

    if ($email.val().search(emailRegExp) == -1) {
      $email.addClass('is-invalid');
      check = false
    } else {
      $email.addClass('is-valid').removeClass('is-invalid');
    }
    
    if ($name.val().search(nameRegExp) == -1) {
      $name.addClass('is-invalid');
      check = false
    } else {
      $name.addClass('is-valid').removeClass('is-invalid');
    }
    
    if ($text.val().search(textRegExp) == -1) {
      $text.addClass('is-invalid');
      check = false
    } else {
      $text.addClass('is-valid').removeClass('is-invalid');
    }
    
    if (check) {
      $button.remove();
      $form.after(`<div class="bg-success text-white p-3">Message sent. We will contact you soon.</div>`);
      
    } else {
      e.preventDefault();
    }
    
        
  });
  $('#sign-btn').on('click', function(e) {
    $( e.currentTarget ).closest( 'ul' ).hide();
    $( 'form#signin' ).removeClass('d-none');
  })
});