function addToCart(id){
    $.ajax({
        url:"/add-to-cart/"+id,
        method:"get",
        success:(response)=>{
            if(response.status){
                let count = response.cartCount;  
                $("#cart-count").html(count);
            }
        }
    })
}