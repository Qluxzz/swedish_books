module BookList exposing (view)

import Book
import Html
import Html.Attributes
import Section


view : Book.ViewOptions -> List Book.Book -> List Book.Book -> List (Html.Html msg)
view viewOptions ratedBooks unratedBooks =
    let
        bView =
            Book.view viewOptions
    in
    [ if List.isEmpty ratedBooks then
        Html.text ""

      else
        Section.ratedBooks
            [ Html.div [ Html.Attributes.class "book-grid" ] (List.map bView ratedBooks) ]
    , if List.isEmpty unratedBooks then
        Html.text ""

      else
        Section.unratedBooks
            [ Html.div [ Html.Attributes.class "book-grid" ] (List.map bView unratedBooks) ]
    ]
